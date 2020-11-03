import type { UpdateStore } from '@src/entities/update-store';
import type { ArmorType } from '@src/features/armor';
import type {
  SourcedEffect,
  HealthRecoveryEffect,
} from '@src/features/effects';
import type { StringID } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { mapProps } from '@src/utility/field-values';
import { localImage } from '@src/utility/images';
import mix from 'mix-with/lib';
import { pipe, merge, pick } from 'remeda';
import { BasicHealthData, CommonHealth, HealthMain, HealthModification, HealthStatMods, HealthType, initializeHealthData } from './health';
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

class BioHealthBase implements CommonHealth {
  readonly main: HealthMain;
  readonly wound;

  constructor( protected readonly init: {
    data: BiologicalHealthData;
    updater: UpdateStore<BiologicalHealthData>;
    source: string;
    isSwarm: boolean;
    statMods: HealthStatMods;
    recovery: ReadonlyArray<SourcedEffect<HealthRecoveryEffect>>;
  }) {
    const { durability, deathRating, damage, ...wound } = pipe(
      {
        baseDurability: init.data.baseDurability,
        deathRatingMultiplier: 1.5,
        statMods: init.statMods,
      },
      initializeHealthData,
      merge({ damage: init.data.damage, wounds: init.data.wounds }),
      mapProps
    );
    this.main = {
      damage,
      durability,
      deathRating,
    };
    if (!init.isSwarm) this.wound = wound;
  }

  get type() {
    return HealthType.Physical
  }

  get source() {
    return this.init.source
  }

  get icon() {
    return localImage("images/icons/health/heart-organ.svg")
  }

  get woundIcon() {
    return localImage("images/icons/health/ragged-wound.svg")
  }

  applyModification(modification: HealthModification) {
    
  }
}

export class BiologicalHealth extends mix(BioHealthBase).with(HealthMixin) {

}