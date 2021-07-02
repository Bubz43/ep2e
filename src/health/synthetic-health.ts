import type { AppliedEffects } from '@src/entities/applied-effects';
import type { ArmorType } from '@src/features/active-armor';
import type {
  HealthRecoveryEffect,
  SourcedEffect,
} from '@src/features/effects';
import { addFeature, StringID } from '@src/features/feature-helpers';
import { currentWorldTimeMS } from '@src/features/time';
import { mapProps } from '@src/utility/field-values';
import { localImage } from '@src/utility/images';
import { LazyGetter } from 'lazy-get-decorator';
import { merge, pipe } from 'remeda';
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
  initializeHealthData,
} from './health';
import type { DamageOverTime } from './health-changes';
import { HealthMixin } from './health-mixin';
import {
  HealOverTimeTarget,
  HealingSlot,
  HealsOverTime,
  RecoveryConditions,
  setupRecoveries,
  useCurrentWorldTimeFlag,
} from './recovery';

export type SyntheticHealthData = BasicHealthData &
  HealsOverTime & {
    /**
     * @minimum 1
     */
    baseDurability: number;
    dots: StringID<DamageOverTime>[];
  };

type Init = HealthInit<SyntheticHealthData> & {
  isSwarm: boolean;
  statMods: HealthStatMods | undefined;
  recoveryEffects: AppliedEffects['physicalHealthRecovery'];
  recoveryConditions: RecoveryConditions;
};

class SyntheticHealthBase implements CommonHealth {
  readonly main: HealthMain;
  readonly wound;

  constructor(protected readonly init: Init) {
    const { durability, deathRating, damage, ...wound } = pipe(
      {
        baseDurability: init.data.baseDurability,
        deathRatingMultiplier: 2,
        statMods: init.statMods,
      },
      initializeHealthData,
      merge({ damage: init.data.damage, wounds: init.data.wounds }),
      mapProps,
    );
    this.main = {
      damage,
      durability,
      deathRating,
    };
    if (!init.isSwarm) this.wound = wound;
  }

  @LazyGetter()
  get recoveries() {
    return setupRecoveries({
      hot: this.init.data,
      biological: false,
      effects: this.init.recoveryEffects,
      conditions: this.init.recoveryConditions,
      updateStartTime: this.init.updater.path('').commit,
    });
  }

  get data() {
    return this.init.data;
  }

  get type() {
    return HealthType.Physical;
  }

  get source() {
    return this.init.source;
  }

  get icon() {
    return localImage('icons/health/techno-heart.svg');
  }

  get woundIcon() {
    return localImage('icons/health/cracked-disc.svg');
  }

  applyModification(modification: HealthModification) {
    return this.init.updater
      .path('')
      .commit((data) => applyHealthModification(data, modification));
  }

  resetLog() {
    return this.init.updater.path('log').commit([]);
  }
}

export class SyntheticHealth extends HealthMixin(SyntheticHealthBase) {
  private resetRegenStartTimes() {
    this.init.updater
      .path('aidedHealTickStartTime')
      .store(useCurrentWorldTimeFlag)
      .path('ownHealTickStartTime')
      .store(useCurrentWorldTimeFlag);
  }

  applyModification(modification: HealthModification) {
    const { damage, wounds } = this.common;
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
    return this.init.updater
      .path('')
      .commit((data) => applyHealthModification(data, modification));
  }

  logHeal(slot: HealingSlot, remainder: number) {
    return this.init.updater
      .path(`${slot}HealTickStartTime` as const)
      .commit(currentWorldTimeMS() - remainder);
  }

  addDamageOverTime(dot: DamageOverTime) {
    return this.init.updater.path('dots').commit(addFeature(dot));
  }
}
