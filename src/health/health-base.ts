import { createEffect } from '@src/features/effects';
import { TagType } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import { nonNegative, notEmpty } from '@src/utility/helpers';
import { clamp, pipe } from 'remeda';
import {
  HealthMain,
  HealthModification,
  HealthStat,
  HealthStatMods,
  HealthType,
  HealthWounds,
  PhysicalHealthSubtype,
} from './health';
import type { HealthRecoveries } from './recovery';

export abstract class HealthBase {
  abstract readonly main: HealthMain;
  abstract readonly wound?: HealthWounds;
  abstract readonly type: HealthType;
  abstract readonly subtype?: PhysicalHealthSubtype;
  abstract readonly source: string;
  abstract readonly icon: string;
  abstract readonly woundIcon: string;
  abstract readonly recoveries?: HealthRecoveries;

  abstract applyMutation(mutation: HealthModification): void;

  protected static initializeData({
    baseDurability,
    deathRatingMultiplier,
    statMods: mods,
    durabilitySplit,
  }: {
    baseDurability: number;
    deathRatingMultiplier: 1.5 | 2;
    statMods?: HealthStatMods | null;
    durabilitySplit?: number;
  }) {
    const derivableDur = baseDurability + (mods?.get(HealthStat.Derived) || 0);
    const split = durabilitySplit || 1;
    const splitDur = Math.round(derivableDur / split);
    const durability = nonNegative(
      splitDur + Math.floor((mods?.get(HealthStat.Durability) || 0) / split),
    );

    return {
      durability,
      deathRating: pipe(
        splitDur * deathRatingMultiplier,
        (dr) => Math.ceil(dr) + (mods?.get(HealthStat.DeathRating) || 0),
        clamp({ min: durability }),
      ),
      woundThreshold: pipe(
        derivableDur / 5,
        (wt) => Math.ceil(wt) + (mods?.get(HealthStat.WoundThreshold) || 0),
        clamp({ min: 1 }),
      ),
      woundsIgnored: clamp(mods?.get(HealthStat.WoundsIgnored) || 0, {
        max: 3,
      }),
      woundModifier: -10 + (mods?.get(HealthStat.WoundModifier) || 0),
    };
  }

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
      wound: !!(!damage && wound?.wounds.value && notEmpty(recoveries?.wound)),
    };
  }
}
