import { CommonInterval, currentWorldTimeMS } from '@src/features/time';
import { mapProps } from '@src/utility/field-values';
import { nonNegative } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import { LazyGetter } from 'lazy-get-decorator';
import { merge, pick, pipe } from 'remeda';
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
  RecoveryConditions,
  setupRecoveries,
} from './recovery';

export type MeshHealthData = BasicHealthData &
  HealsOverTime & {
    /**
     * @minimum 1
     */
    baseDurability: number;
    rebootEndTime: number;
    crashWounds: number;
  };

type Init = HealthInit<MeshHealthData> & {
  homeDevices: number;
  statMods: HealthStatMods | undefined;
  deathRating: boolean;
};

class MeshHealthBase implements CommonHealth {
  readonly main: HealthMain;
  readonly wound: HealthWounds;

  constructor(protected readonly init: Init) {
    const { durability, deathRating, damage, ...wound } = pipe(
      {
        baseDurability: init.data.baseDurability,
        deathRatingMultiplier: 2,
        statMods: init.statMods,
        durabilitySplit: init.homeDevices,
      },
      initializeHealthData,
      merge({ damage: init.data.damage, wounds: init.data.wounds }),
      mapProps,
    );
    this.main = {
      damage,
      durability,
      deathRating: init.deathRating ? deathRating : undefined,
    };
    this.wound = wound;
  }

  @LazyGetter()
  get recoveries() {
    return setupRecoveries({
      hot: this.init.data,
      biological: true,
      effects: [],
      conditions: RecoveryConditions.Normal,
      updateStartTime: this.init.updater.prop('').commit,
    });
  }

  get data() {
    return this.init.data;
  }

  get type() {
    return HealthType.Mesh;
  }

  get icon() {
    return localImage(`icons/health/artificial-intelligence.svg`);
  }

  get woundIcon() {
    return localImage(`icons/health/cpu-shot.svg`);
  }

  get source() {
    return this.init.source;
  }

  applyModification(modification: HealthModification) {
    // TODO Crashed vs not crashed
    return this.init.updater
      .prop('')
      .commit((data) => applyHealthModification(data, modification));
  }

  resetLog() {
    return this.init.updater.prop('log').commit([]);
  }
}

export class MeshHealth extends HealthMixin(MeshHealthBase) {
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
    const { value: dur } = this.main.durability;
    switch (modification.mode) {
      case HealthModificationMode.Edit: {
        if (!damage && modification.damage) this.resetRegenStartTimes();
        else if (damage && !modification.damage) this.resetRegenStartTimes();
        else if (this.regenState !== HealOverTimeTarget.Damage) {
          if (!wounds && modification.wounds) this.resetRegenStartTimes();
          else if (wounds && !damage && modification.damage)
            this.resetRegenStartTimes();
        }

        if (damage < dur && modification.damage >= dur) {
          updater
            .prop('crashWounds')
            .store(modification.wounds)
            .prop('rebootEndTime')
            .store(-1);
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

        if (damage < dur && modification.damage + damage >= dur) {
          updater
            .prop('crashWounds')
            .store((wounds || 0) + modification.wounds)
            .prop('rebootEndTime')
            .store(-1);
        }
        break;
      }

      case HealthModificationMode.Heal: {
        if (damage && modification.damage >= damage)
          this.resetRegenStartTimes();
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

  get isCrashed() {
    return this.common.damage >= this.main.durability.value;
  }

  setRebootTime(turns: number) {
    return this.init.updater
      .prop('rebootEndTime')
      .commit(currentWorldTimeMS() + CommonInterval.Turn * turns);
  }

  get timeToReboot() {
    const { rebootEndTime } = this.data;
    return rebootEndTime >= 0 ? rebootEndTime - currentWorldTimeMS() : null;
  }

  reboot() {
    const { wounds = 0, damage } = this.common;
    const { crashWounds } = this.data;
    const { value: dur } = this.main.durability;
    const keptDamage = nonNegative(damage - dur);
    const keptWounds = nonNegative(wounds - crashWounds);
    return this.init.updater.prop('').commit({
      damage: 0 + keptDamage,
      wounds: 0 + keptWounds,
      crashWounds: 0,
      rebootEndTime: -1,
    });
  }
}
