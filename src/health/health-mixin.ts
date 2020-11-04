import type { ObtainableEffects } from '@src/entities/applied-effects';
import { createEffect } from '@src/features/effects';
import { TagType } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import type { Constructor } from 'mix-with/lib';
import { clamp } from 'remeda';
import type { Class } from 'type-fest';
import type { CommonHealth } from './health';

export const HealthMixin = <T extends Class<CommonHealth>>(cls: T) => {
  class Health extends cls implements ObtainableEffects {
    obtainEffects() {
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
      return {
        durability: Math.min(main.damage.value / main.durability.value, 1),
        deathRating:
          main.deathRating &&
          clamp(
            (main.damage.value - main.durability.value) /
              (main.deathRating.value - main.durability.value),
            { min: 0, max: 1 },
          ),
      };
    }

    get regenState() {
      const { main, wound, recoveries } = this;
      const damage = !!(main.damage.value && notEmpty(recoveries?.damage));
      return {
        damage: damage,
        wound: !!(
          !damage &&
          wound?.wounds.value &&
          notEmpty(recoveries?.wound)
        ),
      };
    }
  }
  return Health;
};
