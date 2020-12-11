import type { ArmorType } from '@src/features/active-armor';
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
import { DotOrHotTarget, HealingSlot, HealsOverTime, setupRecoveries } from './recovery';

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
  recoveryEffects: ReadonlyArray<SourcedEffect<HealthRecoveryEffect>>;
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
      biological: true,
      effects: this.init.recoveryEffects,
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
      .prop('')
      .commit((data) => applyHealthModification(data, modification));
  }

  resetLog() {
    return this.init.updater.prop('log').commit([]);
  }
}

export class SyntheticHealth extends HealthMixin(SyntheticHealthBase) {
  applyModification(modification: HealthModification) {
    const { updater } = this.init;
    if (modification.mode !== HealthModificationMode.Heal || (this.regenState === DotOrHotTarget.Damage && modification.damage >= this.main.damage.value)) {
      if (!this.regenState) {
        updater
          .prop('aidedHealTickStartTime')
          .store(currentWorldTimeMS())
          .prop('ownHealTickStartTime')
          .store(currentWorldTimeMS());
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
