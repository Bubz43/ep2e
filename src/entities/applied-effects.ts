import type { PoolType } from '@src/data-enums';
import {
  createEffect,
  DurationEffectTarget,
  Effect,
  EffectType,
  HealthEffect,
  PoolEffect,
  Source,
  SourcedEffect,
  SuccessTestEffect,
} from '@src/features/effects';
import { SkillType } from '@src/features/skills';
import { createTag } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import type {
  HealthType,
  HealthStat,
  HealthStatMods,
} from '@src/health/health';
import { pipe, concat, filter, allPass, clamp } from 'remeda';

export type AddEffects = {
  source: string;
  effects: Effect[];
};

export type ReadonlyAppliedEffects = Omit<AppliedEffects, 'add'>;

export interface ObtainableEffects {
  obtainEffects(): AddEffects | null
}

const defaultSuccessTestEffects = (): SourcedEffect<SuccessTestEffect>[] => [
  {
    [Source]: localize('distracted'),
    ...createEffect.successTest({
      modifier: -20,
      requirement: 'Passive',
      tags: [createTag.skill({ skillType: SkillType.Perceive })],
    }),
  },
];

export class AppliedEffects {
  private readonly groups = new Map<EffectType, SourcedEffect<Effect>[]>();
  private readonly healthEffects = new Map<
    HealthType,
    Map<HealthStat, number>
  >();

  #total = 0;

  get total() {
    return this.#total;
  }

  get uniqueEffects() {
    return new Set(
      this.getGroup(EffectType.Misc).flatMap(({ unique }) => unique || []),
    );
  }

  get timeframeEffects() {
    return this.getGroup(EffectType.Duration).filter(
      (effect) => effect.subtype === DurationEffectTarget.TaskActionTimeframe,
    );
  }

  get poolBonuses() {
    return this.getGroup(EffectType.Pool).reduce((accum, effect) => {
      const { modifier, pool } = effect;
      const { effects = [], total = 0 } = accum.get(pool) ?? {};
      return accum.set(pool, {
        effects: effects.concat(effect),
        total: total + modifier,
      });
    }, new Map<PoolType, { effects: SourcedEffect<PoolEffect>[]; total: number }>());
  }

  getHealthStatMods(type: HealthType) {
    return this.healthEffects.get(type) as undefined | HealthStatMods;
  }

  getGroup<T extends EffectType>(type: T) {
    return (this.groups.get(type) || ([] as unknown)) as ReadonlyArray<
      Readonly<SourcedEffect<ReturnType<typeof createEffect[T]>>>
    >;
  }

  initiativeTotal(baseInitiative: number) {
    return this.getGroup(EffectType.Initiative).reduce(
      (accum, { modifier }) => (accum += modifier),
      baseInitiative,
    );
  }

  getMatchingSuccessTestEffects(
    condition: (effect: SuccessTestEffect) => boolean,
    toOpponent: boolean,
  ) {
    return pipe(
      this.getGroup(EffectType.SuccessTest),
      concat(defaultSuccessTestEffects()),
      filter(
        allPass([(effect) => effect.toOpponent === toOpponent, condition]),
      ),
    );
  }

  add = (effecsToAdd: AddEffects | null | undefined) => {
    if (!effecsToAdd) return;

    const { source, effects } = effecsToAdd;

    for (const effect of effects) {
      ++this.#total;
      const collection = this.groups.get(effect.type);
      const sourcedEffect: SourcedEffect<typeof effect> = Object.assign(
        effect,
        { [Source]: source },
      );

      if (collection) collection.push(sourcedEffect);
      else this.groups.set(effect.type, [sourcedEffect]);

      if (effect.type === EffectType.Health) this.addHealthEffect(effect);
    }
  };

  private addHealthEffect({ health, stat, modifier }: HealthEffect) {
    let map = this.healthEffects.get(health);
    if (!map) {
      map = new Map<HealthStat, number>();
      this.healthEffects.set(health, map);
    }
    map.set(stat, (map.get(stat) || 0) + modifier);
  }
}
