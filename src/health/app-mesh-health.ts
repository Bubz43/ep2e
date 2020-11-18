import { mapProps } from '@src/utility/field-values';
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
  HealthType,
  HealthWounds,
  initializeHealthData
} from './health';
import { HealthMixin } from './health-mixin';
import type { DotOrHotTarget } from './recovery';


export type AppMeshHealthData = Omit<MeshHealthData, DotOrHotTarget>

type Init = HealthInit<AppMeshHealthData> 

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
      deathRating
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

export class AppMeshHealth extends HealthMixin(MeshHealthBase) {}
