import type { ArmorType } from '@src/features/armor';
import type {
  HealthRecoveryEffect,
  SourcedEffect,
} from '@src/features/effects';
import type { StringID } from '@src/features/feature-helpers';
import { mapProps } from '@src/utility/field-values';
import { localImage } from '@src/utility/images';
import { merge, pipe } from 'remeda';
import {
  applyHealthModification,
  BasicHealthData,
  CommonHealth,
  HealthInit,
  HealthMain,
  HealthModification,
  HealthStatMods,
  HealthType,
  initializeHealthData,
} from './health';
import { HealthMixin } from './health-mixin';
import type { HealsOverTime } from './recovery';

export type BiologicalHealthData = BasicHealthData & {
  /**
   * @minimum 1
   */
  baseDurability: number;
  hot: HealsOverTime;
  bleedingOut: boolean;
  dots: StringID<{
    formula: string;
    armorPiercing: boolean;
    armorRemoving: boolean;
    armorUsed: ArmorType[];
    duration: number;
    elapsed: number;
  }>[];
};

type Init = HealthInit<BiologicalHealthData> & {
  isSwarm: boolean;
  statMods: HealthStatMods | undefined;
  recovery: ReadonlyArray<SourcedEffect<HealthRecoveryEffect>>;
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

  get type() {
    return HealthType.Physical;
  }

  get source() {
    return this.init.source;
  }

  get icon() {
    return localImage('images/icons/health/heart-organ.svg');
  }

  get woundIcon() {
    return localImage('images/icons/health/ragged-wound.svg');
  }

  applyModification(modification: HealthModification) {
    return this.init.updater
      .prop('')
      .commit((data) => applyHealthModification(data, modification));
  }
}

export class BiologicalHealth extends HealthMixin(BiologicalHealthBase) {}
