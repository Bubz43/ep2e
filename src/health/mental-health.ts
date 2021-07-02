import type { AppliedEffects } from '@src/entities/applied-effects';
import type { HealthRecoveryEffect } from '@src/features/effects';
import { addFeature, StringID } from '@src/features/feature-helpers';
import { currentWorldTimeMS, getElapsedTime } from '@src/features/time';
import { mapProps } from '@src/utility/field-values';
import { localImage } from '@src/utility/images';
import { LazyGetter } from 'lazy-get-decorator';
import { clamp, last, pick } from 'remeda';
import {
  applyHealthModification,
  BasicHealthData,
  CommonHealth,
  HealthInit,
  HealthMain,
  HealthModification,
  HealthModificationMode,
  HealthStatMods,
  HealthType,
  HealthWounds,
  initializeHealthData,
} from './health';
import { HealthMixin } from './health-mixin';
import {
  HealingSlot,
  HealOverTimeTarget,
  HealsOverTime,
  NaturalMentalHealAttempt,
  RecoveryConditions,
  setupRecoveries,
} from './recovery';

export enum StressType {
  Alienation = 'alienation',
  Helplessness = 'helplessness',
  TheUnknown = 'theUnknown',
  Violence = 'violence',
}

export type MentalHealthData = BasicHealthData &
  HealsOverTime & {
    /**
     * @minimum 0
     * @maximum 5
     */
    alienation: number;
    /**
     * @minimum 0
     * @maximum 5
     */
    helplessness: number;
    /**
     * @minimum 0
     * @maximum 5
     */
    violence: number;
    lastGainedStressTime: number;
    naturalHealAttempts: StringID<NaturalMentalHealAttempt>[];
  };

export const hardeningTypes = [
  StressType.Alienation,
  StressType.Helplessness,
  StressType.Violence,
] as const;

type Init = HealthInit<MentalHealthData> & {
  statMods: HealthStatMods | undefined;
  willpower: number;
  recoveryEffects?: AppliedEffects['physicalHealthRecovery'];
};

class MentalHealthBase implements CommonHealth {
  readonly main: HealthMain;
  readonly wound: HealthWounds;

  constructor(protected readonly init: Init) {
    const { statMods, willpower, data } = init;
    const {
      durability: lucidity,
      deathRating: insanityRating,
      woundThreshold: traumaThreshold,
      woundsIgnored: traumasIgnored,
      woundModifier: traumaModifier,
    } = initializeHealthData({
      baseDurability: willpower * 2,
      deathRatingMultiplier: 2,
      statMods,
    });

    const mapped = mapProps({
      stress: data.damage,
      traumas: data.wounds,
      lucidity,
      insanityRating,
      traumaThreshold,
      traumasIgnored,
      traumaModifier,
    });

    this.main = {
      damage: mapped.stress,
      durability: mapped.lucidity,
      deathRating: mapped.insanityRating,
    };

    this.wound = {
      wounds: mapped.traumas,
      woundThreshold: mapped.traumaThreshold,
      woundModifier: mapped.traumaModifier,
      woundsIgnored: mapped.traumasIgnored,
    };
  }

  @LazyGetter()
  get recoveries() {
    return setupRecoveries({
      hot: this.init.data,
      biological: true,
      effects: this.init.recoveryEffects || {
        recovery: this.init.recoveryEffects || [],
        timeframeMultipliers: [],
      },
      conditions: RecoveryConditions.Normal,
      updateStartTime: this.init.updater.path('').commit,
    });
  }

  get data() {
    return this.init.data;
  }

  get type() {
    return HealthType.Mental;
  }

  get icon() {
    return localImage('icons/health/self-love.svg');
  }

  get woundIcon() {
    return localImage('icons/health/stoned-skull.svg');
  }

  get source() {
    return this.init.source;
  }

  get hardening() {
    return pick(this.init.data, hardeningTypes);
  }

  updateHardening(hardening: typeof hardeningTypes[number], newVal: number) {
    return this.init.updater
      .path(hardening)
      .commit(clamp(newVal, { min: 0, max: 5 }));
  }

  get timeSinceLastStress() {
    return getElapsedTime(this.data.lastGainedStressTime);
  }

  get timeSinceHealAttempt() {
    const lastAttempt = last(this.data.naturalHealAttempts);
    return lastAttempt ? getElapsedTime(lastAttempt.worldTimeMS) : null;
  }

  logNaturalHeal(attempt: NaturalMentalHealAttempt) {
    return this.init.updater
      .path('naturalHealAttempts')
      .commit(addFeature(attempt));
  }

  logHeal(slot: HealingSlot, remainder: number) {
    return this.init.updater
      .path(`${slot}HealTickStartTime` as const)
      .commit(currentWorldTimeMS() - remainder);
  }

  protected canHarden(
    stressType: HealthModification['stressType'],
  ): stressType is typeof hardeningTypes[number] {
    return !!(
      stressType &&
      stressType !== StressType.TheUnknown &&
      this.hardening[stressType] < 5
    );
  }

  applyModification(modification: HealthModification) {
    const { updater } = this.init;
    if (
      modification.mode === HealthModificationMode.Inflict &&
      modification.wounds &&
      this.canHarden(modification.stressType)
    ) {
      updater.path(modification.stressType).store((val) => val + 1);
    }
    if (
      modification.mode === HealthModificationMode.Inflict ||
      (modification.mode === HealthModificationMode.Edit &&
        modification.damage > this.main.damage.value)
    ) {
      updater.path('lastGainedStressTime').commit(currentWorldTimeMS());
    }
    return updater
      .path('')
      .commit((data) => applyHealthModification(data, modification));
  }

  resetLog() {
    return this.init.updater.path('log').commit([]);
  }
}

export class MentalHealth extends HealthMixin(MentalHealthBase) {
  private resetRegenStartTimes() {
    this.init.updater
      .path('aidedHealTickStartTime')
      .store(currentWorldTimeMS())
      .path('ownHealTickStartTime')
      .store(currentWorldTimeMS());
  }

  applyModification(modification: HealthModification) {
    const { updater } = this.init;
    const { damage, wounds } = this.data;
    switch (modification.mode) {
      case HealthModificationMode.Edit: {
        if (!damage && modification.damage) this.resetRegenStartTimes();
        else if (damage && !modification.damage) this.resetRegenStartTimes();
        else if (this.regenState !== HealOverTimeTarget.Damage) {
          if (!wounds && modification.wounds) this.resetRegenStartTimes();
          else if (wounds && !damage && modification.damage)
            this.resetRegenStartTimes();
        }

        break;
      }
      case HealthModificationMode.Inflict: {
        if (!damage && modification.damage) this.resetRegenStartTimes();
        else if (this.regenState !== HealOverTimeTarget.Damage) {
          if (!wounds && modification.wounds) this.resetRegenStartTimes();
          else if (wounds && !damage && modification.damage)
            this.resetRegenStartTimes();
        }

        break;
      }

      case HealthModificationMode.Heal: {
        if (damage && modification.damage >= damage)
          this.resetRegenStartTimes();
        break;
      }
    }

    if (
      modification.mode === HealthModificationMode.Inflict &&
      modification.wounds &&
      this.canHarden(modification.stressType)
    ) {
      updater.path(modification.stressType).store((val) => val + 1);
    }
    if (
      modification.mode === HealthModificationMode.Inflict ||
      (modification.mode === HealthModificationMode.Edit &&
        modification.damage > this.main.damage.value)
    ) {
      updater.path('lastGainedStressTime').commit(currentWorldTimeMS());
    }
    return updater
      .path('')
      .commit((data) => applyHealthModification(data, modification));
  }
}
