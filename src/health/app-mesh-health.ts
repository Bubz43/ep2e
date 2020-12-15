import { currentWorldTimeMS, CommonInterval } from '@src/features/time';
import { mapProps } from '@src/utility/field-values';
import { nonNegative } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import { merge, pipe } from 'remeda';
import type { MeshHealthData } from './full-mesh-health';
import {
  applyHealthModification,
  BasicHealthData,
  CommonHealth,
  HealthInit,
  HealthMain,
  HealthModification,
  HealthModificationMode,
  HealthType,
  HealthWounds,
  initializeHealthData,
} from './health';
import { HealthMixin } from './health-mixin';
import type { HealingSlot, HealsOverTime } from './recovery';

export type AppMeshHealthData = Omit<MeshHealthData, keyof HealsOverTime>;

type Init = HealthInit<AppMeshHealthData>;

class MeshHealthBase implements CommonHealth {
  readonly main: HealthMain;
  readonly wound: HealthWounds;

  constructor(protected readonly init: Init) {
    const { durability, deathRating, damage, ...wound } = pipe(
      {
        baseDurability: init.data.baseDurability,
        deathRatingMultiplier: 2,
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
    this.wound = wound;
  }

  get data() {
    return this.init.data;
  }

  get type() {
    return HealthType.Mesh;
  }

  get icon() {
    return localImage(`icons/health/computing.svg`);
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

export class AppMeshHealth extends HealthMixin(MeshHealthBase) {
  applyModification(modification: HealthModification) {
    const { updater } = this.init;
    const { damage, wounds } = this.common;
    const { value: dur } = this.main.durability;
    switch (modification.mode) {
      case HealthModificationMode.Edit: {
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
        if (damage < dur && modification.damage + damage >= dur) {
          updater
            .prop('crashWounds')
            .store((wounds || 0) + modification.wounds)
            .prop('rebootEndTime')
            .store(-1);
        }
        break;
      }

      case HealthModificationMode.Heal:
        break;
    }

    return updater
      .prop('')
      .commit((data) => applyHealthModification(data, modification));
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
    const newDamage = nonNegative(damage - dur);
    const newWounds = nonNegative(wounds - crashWounds);
    return this.init.updater.prop('').commit({
      damage: newDamage,
      wounds: newWounds,
      crashWounds: 0,
      rebootEndTime: -1,
    });
  }
}
