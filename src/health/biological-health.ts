import type {
  HealthRecoveryEffect,
  SourcedEffect,
} from '@src/features/effects';
import type { StringID } from '@src/features/feature-helpers';
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
import { DotOrHotTarget, HealingSlot, HealsOverTime, RecoveryConditions, setupRecoveries } from './recovery';

export type BiologicalHealthData = BasicHealthData &
  HealsOverTime & {
    /**
     * @minimum 1
     */
    baseDurability: number;
    bleedingOut: boolean;
    dots: StringID<DamageOverTime>[];
  };

type Init = HealthInit<BiologicalHealthData> & {
  isSwarm: boolean;
  statMods: HealthStatMods | undefined;
  recoveryEffects: ReadonlyArray<SourcedEffect<HealthRecoveryEffect>>;
  recoveryConditions: RecoveryConditions
};

class BiologicalHealthBase implements CommonHealth {
  readonly main: HealthMain;
  readonly wound;

  constructor(protected readonly init: Init) {
    const { durability, deathRating, damage, ...wound } = pipe(
      {
        baseDurability: init.data.baseDurability,
        deathRatingMultiplier: 1.5,
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
      biological: true,
      effects: this.init.recoveryEffects,
      conditions: this.init.recoveryConditions
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
    return localImage('icons/health/heart-organ.svg');
  }

  get woundIcon() {
    return localImage('icons/health/ragged-wound.svg');
  }

  applyModification(modification: HealthModification) {
    return this.init.updater
      .prop('')
      .commit((data) => applyHealthModification(data, modification));
  }

  resetLog() {
    return this.init.updater.prop('log').commit([]);
  }
}

export class BiologicalHealth extends HealthMixin(BiologicalHealthBase) {
  private resetRegenStartTimes() {
    this.init.updater
          .prop('aidedHealTickStartTime')
          .store(currentWorldTimeMS())
          .prop('ownHealTickStartTime')
          .store(currentWorldTimeMS());
  }
  
  applyModification(modification: HealthModification) {
    const { updater } = this.init;
    const { damage, wounds } = this.common;
    switch (modification.mode) {
      case HealthModificationMode.Edit: {
        if (!damage && modification.damage) this.resetRegenStartTimes();
        else if (damage && !modification.damage) this.resetRegenStartTimes();
        else if (!wounds && modification.wounds) this.resetRegenStartTimes();
        else if (wounds && !damage && modification.damage) this.resetRegenStartTimes();
        break;
      }
      case HealthModificationMode.Inflict: {
        if (!damage && modification.damage) this.resetRegenStartTimes();
        else if (!wounds && modification.wounds) this.resetRegenStartTimes();
        else if (wounds && !damage && modification.damage) this.resetRegenStartTimes();
        break;
      }
      
      case HealthModificationMode.Heal: {
        if (damage && modification.damage >= damage) this.resetRegenStartTimes();
        break;
      }
    }
  
    return updater
      .prop('')
      .commit((data) => applyHealthModification(data, modification));
  }

  logHeal(slot: HealingSlot) {
    return this.init.updater
      .prop(`${slot}HealTickStartTime` as const)
      .commit(currentWorldTimeMS());
  }
}
