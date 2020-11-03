import type { UpdateStore } from "@src/entities/update-store";
import type { ArmorType } from "@src/features/armor";
import type { SourcedEffect, HealthRecoveryEffect } from "@src/features/effects";
import type { StringID } from "@src/features/feature-helpers";
import { mapProps } from "@src/utility/field-values";
import { localImage } from "@src/utility/images";
import mix from "mix-with/lib";
import { pipe, merge } from "remeda";
import type { BiologicalHealthData } from "./biological-health";
import { applyHealthModification, BasicHealthData, CommonHealth, HealthInit, HealthMain, HealthModification, HealthStatMods, HealthType, initializeHealthData } from "./health";
import { HealthMixin } from "./health-mixin";
import type { HealsOverTime } from "./recovery";

export type SyntheticHealthData = BasicHealthData & {
   /**
   * @minimum 1
   */
  baseDurability: number;
  hot: HealsOverTime;
  dots: StringID<{
    formula: string;
    armorPiercing: boolean;
    armorRemoving: boolean;
    armorUsed: ArmorType[];
    duration: number;
    elapsed: number;
  }>[];
}

type Init = HealthInit<SyntheticHealthData> & {
  isSwarm: boolean;
  statMods: HealthStatMods;
  recovery: ReadonlyArray<SourcedEffect<HealthRecoveryEffect>>;
}

class SyntheticHealthBase implements CommonHealth {
  readonly main: HealthMain;
  readonly wound;

  constructor(
    protected readonly init: Init,
  ) {
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

  get type() {
    return HealthType.Physical;
  }

  get source() {
    return this.init.source;
  }

  get icon() {
    return localImage('images/icons/health/techno-heart.svg');
  }

  get woundIcon() {
    return localImage('images/icons/health/cracked-disc.svg');
  }

  applyModification(modification: HealthModification) {
    return this.init.updater
      .prop('')
      .commit((data) => applyHealthModification(data, modification));
  }
}

export class SyntheticHealth extends HealthMixin(SyntheticHealthBase) {
}
