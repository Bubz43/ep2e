import { mapProps } from '@src/utility/field-values';
import { localImage } from '@src/utility/images';
import mix from 'mix-with/lib';
import { pipe, merge } from 'remeda';
import {
  applyHealthModification,
  BasicHealthData,
  CommonHealth,
  HealthInit,
  HealthMain,
  HealthModification,
  HealthStatMods,
  HealthType,
  HealthWounds,
  initializeHealthData,
} from './health';
import { HealthMixin } from './health-mixin';
import type { HealsOverTime } from './recovery';

export type InfomorphHealthData = BasicHealthData & {
  /**
   * @minimum 1
   */
  baseDurability: number;
  hot: HealsOverTime;
  reboot: number;
};

type Init = HealthInit<InfomorphHealthData> & {
  homeDevices: number;
  statMods: HealthStatMods;
};

class InfomorphHealthBase implements CommonHealth {
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
      deathRating,
    };
    this.wound = wound;
  }

  get type() {
    return HealthType.Mesh;
  }

  get icon() {
    return localImage(`images/icons/health/artificial-intelligence.svg`);
  }

  get woundIcon() {
    return localImage(`images/icons/health/cpu-shot.svg`);
  }

  get source() {
    return this.init.source;
  }

  applyModification(modification: HealthModification) {
    return this.init.updater
      .prop('')
      .commit((data) => applyHealthModification(data, modification));
  }
}

export class InfomorphHealth extends mix(InfomorphHealthBase).with(
  HealthMixin,
) {
  constructor(init: Init) {
    super(init);
  }
}
