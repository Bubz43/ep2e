import type { PoolType } from '@src/data-enums';
import {
  createEffect,
  DurationEffect,
  durationEffectMultiplier,
  DurationEffectTarget,
  Effect,
  EffectType,
  extractDurationEffectMultipliers,
  HealthEffect,
  MovementEffect,
  MovementEffectMode,
  MovementEffectsInfo,
  PoolEffect,
  Source,
  SourcedEffect,
  SuccessTestEffect,
  UniqueEffectType,
} from '@src/features/effects';
import type { Movement, MovementRate } from '@src/features/movement';
import { SkillType } from '@src/features/skills';
import { createTag } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import type {
  HealthType,
  HealthStat,
  HealthStatMods,
} from '@src/health/health';
import { notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import { pipe, concat, filter, allPass, clamp, groupBy, compact } from 'remeda';
import type { ActiveSubstanceState } from './models';

export type AddEffects = {
  source: string;
  effects: Effect[];
};

export type ReadonlyAppliedEffects = Omit<AppliedEffects, 'add'>;

export interface ObtainableEffects {
  readonly currentEffects: AddEffects | AddEffects[] | null;
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

  private _total = 0;

  get total() {
    return this._total;
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
      effects.push(effect);
      return accum.set(pool, {
        effects: effects,
        total: total + modifier,
      });
    }, new Map<PoolType, { effects: SourcedEffect<PoolEffect>[]; total: number }>());
  }

  get movementEffects() {
    const granted: SourcedEffect<MovementRate>[] = [];
    const modify = new Map<Movement, MovementEffectsInfo>();
    for (const effect of this.getGroup(EffectType.Movement)) {
      if (effect.mode === MovementEffectMode.Grant) {
        granted.push({
          type: effect.movementType,
          base: effect.base,
          full: effect.full,
          [Source]: effect[Source],
        });
      } else {
        let info = modify.get(effect.movementType);
        if (!info) {
          info = {
            modify: [],
            baseModification: 0,
            fullModification: 0,
          };
          modify.set(effect.movementType, info);
        }

        info.modify.push(effect);
        info.baseModification += effect.base;
        info.fullModification += effect.full;
      }
    }
    return { granted, modify };
  }

  getHealthStatMods(type: HealthType) {
    return this.healthEffects.get(type) as undefined | HealthStatMods;
  }

  getGroup<T extends EffectType>(type: T) {
    return (this.groups.get(type) || ([] as unknown)) as ReadonlyArray<
      Readonly<SourcedEffect<ReturnType<typeof createEffect[T]>>>
    >;
  }

  get healthRecovery() {
    return {
      recovery: this.getGroup(EffectType.HealthRecovery),
      timeframeMultipliers: extractDurationEffectMultipliers(
        this.durationEffects.healingTimeframes || [],
      ),
    };
  }

  get substanceModifiers() {
    return {
      misc: this.getGroup(EffectType.Misc).filter(
        (effect) => effect.unique === UniqueEffectType.HalveDrugEffects,
      ),
      duration: this.durationEffects.drugOrToxin || []
    }
   
  }

  @LazyGetter()
  get durationEffects() {
    return groupBy(
      this.getGroup(EffectType.Duration),
      (item) => item.subtype,
    ) as Partial<Record<DurationEffectTarget, SourcedEffect<DurationEffect>[]>>;
  }

  get taskTimeframeEffects() {
    const effects = new Map<
      DurationEffect['taskType'],
      SourcedEffect<DurationEffect>[]
    >();
    for (const effect of this.durationEffects.taskActionTimeframe || []) {
      effects.get(effect.taskType)?.push(effect) ??
        effects.set(effect.taskType, [effect]);
    }
    return effects;
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

  add = (toAdd: AddEffects | AddEffects[] | null | undefined) => {
    if (!toAdd) return;
    if (Array.isArray(toAdd)) {
      toAdd.forEach(this.add);
      return;
    }

    const { source, effects } = toAdd;

    for (const effect of effects) {
      ++this._total;
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
