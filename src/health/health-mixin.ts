import type { ObtainableEffects } from '@src/entities/applied-effects';
import { createEffect } from '@src/features/effects';
import { TagType } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import { nonNegative, notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import { clamp } from 'remeda';
import type { Class } from 'type-fest';
import type { DeepReadonly } from 'utility-types';
import type { AppMeshHealth } from './app-mesh-health';
import type { BiologicalHealth } from './biological-health';
import type { MeshHealth } from './full-mesh-health';
import type { CommonHealth } from './health';
import type { MentalHealth } from './mental-health';
import { DotOrHotTarget } from './recovery';
import type { SyntheticHealth } from './synthetic-health';

export type Health = CommonHealth &
  ObtainableEffects &
  DeepReadonly<{
    damagePercents: {
      durability: number;
      deathRating: number | null;
      dead: boolean;
    };
    regenState: {
      damage: boolean;
      wound: boolean;
    };
  }>;

export type ActorHealth =
  | MentalHealth
  | BiologicalHealth
  | SyntheticHealth
  | MeshHealth
  | AppMeshHealth;
  

export const HealthMixin = <T extends Class<CommonHealth>>(cls: T) => {
  class HealthInfo extends cls implements Health, ObtainableEffects {
    @LazyGetter()
    get currentEffects() {
      const { wound, type } = this;
      if (!wound) return null;
      const { wounds, woundsIgnored, woundModifier } = wound;
      const activeTraumas = wounds.value - woundsIgnored.value;

      return activeTraumas > 0
        ? {
            source: `${localize(type)} ${wounds.label}`,
            effects: [
              createEffect.initiative({ modifier: activeTraumas * -1 }),
              createEffect.successTest({
                modifier: activeTraumas * woundModifier.value,
                tags: [{ type: TagType.AllActions }],
              }),
            ],
          }
        : null;
    }

    get damagePercents() {
      const { main } = this;
      const durability = Math.min(main.damage.value / main.durability.value, 1);
      const deathRating =
        main.deathRating && main.deathRating.value > main.durability.value
          ? clamp(
              (main.damage.value - main.durability.value) /
                (main.deathRating.value - main.durability.value),
              { min: 0, max: 1 },
            )
          : null;
      return {
        durability,
        deathRating,
        dead: (deathRating ?? durability) >= 1,
      };
    }

    get regenState() {
      const { main, wound, recoveries } = this;
      const damage = !!(
        main.damage.value && notEmpty(recoveries?.[DotOrHotTarget.Damage])
      );
      return {
        damage: damage,
        wound: !!(
          !damage &&
          wound?.wounds.value &&
          notEmpty(recoveries?.[DotOrHotTarget.Wound])
        ),
      };
    }

    get log() {
      return this.data.log;
    }

    computeWounds(damage: number) {
      return this.wound
        ? clamp(Math.floor(damage / (this.wound.woundThreshold.value || 1)), {
            max: damage,
            min: 0,
          })
        : 0;
    }

    get killingDamage() {
      const target = this.main.deathRating?.value || this.main.durability.value;
      return nonNegative(target - this.main.damage.value);
    }
  }

  return HealthInfo;
};
