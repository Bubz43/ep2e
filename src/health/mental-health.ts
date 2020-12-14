import type { StringID } from '@src/features/feature-helpers';
import { currentWorldTimeMS, getElapsedTime } from '@src/features/time';
import { mapProps } from '@src/utility/field-values';
import { localImage } from '@src/utility/images';
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
import type { NaturalMentalHealAttempt } from './recovery';

export enum StressType {
  Alienation = 'alienation',
  Helplessness = 'helplessness',
  TheUnknown = 'theUnknown',
  Violence = 'violence',
}

export type MentalHealthData = BasicHealthData & {
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
      .prop(hardening)
      .commit(clamp(newVal, { min: 0, max: 5 }));
  }

  get timeSinceLastStress() {
    return getElapsedTime(this.data.lastGainedStressTime);
  }

  get timeSinceHealAttempt() {
    const lastAttempt = last(this.data.naturalHealAttempts)
    return lastAttempt ? getElapsedTime(lastAttempt.worldTimeMS) : null
  }

  private canHarden(
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
      updater.prop(modification.stressType).store((val) => val + 1);
    }
    if (
      modification.mode === HealthModificationMode.Inflict ||
      (modification.mode === HealthModificationMode.Edit &&
        modification.damage > this.main.damage.value)
    ) {
      updater.prop('lastGainedStressTime').commit(currentWorldTimeMS());
    }
    return updater
      .prop('')
      .commit((data) => applyHealthModification(data, modification));
  }

  resetLog() {
    return this.init.updater.prop('log').commit([]);
  }
}

export class MentalHealth extends HealthMixin(MentalHealthBase) {}
