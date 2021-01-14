import { rollModeToVisibility } from '@src/chat/create-message';
import { PoolType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  Action,
  ActionType,
  createAction,
  updateAction,
} from '@src/features/actions';
import type { SourcedEffect, SuccessTestEffect } from '@src/features/effects';
import { Pool, PreTestPoolAction } from '@src/features/pool';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import type { WithUpdate } from '@src/utility/updating';
import { immerable, produce, produceWithPatches } from 'immer';
import type { Draft } from 'immer/dist/internal';
import { LazyGetter } from 'lazy-get-decorator';
import { compact, equals, merge } from 'remeda';
import { BehaviorSubject } from 'rxjs';
import {
  createSuccessTestModifier,
  PreTestPool,
  SuccessTestModifier,
  SuccessTestPools,
  SuccessTestSettings,
} from './success-test';

export type SkillTestInit = {
  ego: Ego;
  skill: Skill;
  character?: Character;
  token?: MaybeToken;
  action?: Action;
};

export class SkillTest {
  readonly [immerable] = true;

  private readonly state = new BehaviorSubject(this);
  readonly subscribe = this.state.subscribe.bind(this.state);
  readonly ego;
  readonly character;
  readonly token;

  readonly action: WithUpdate<Action> & {
    modifier: SuccessTestModifier;
    color?: number;
  };

  readonly settings: WithUpdate<SuccessTestSettings> = {
    visibility: rollModeToVisibility(game.settings.get('core', 'rollMode')),
    autoRoll: true,
    update: (changed) => {
      this.update((recipe) => {
        recipe.settings = merge(recipe.settings, changed);
      });
    },
  };

  readonly pools: SuccessTestPools = {
    available: [],
    active: null,
    toggleActive: (pair) => {
      this.update((draft) => this.togglePool(draft, pair));
    },
  };

  readonly modifiers = {
    effects: new Map<SourcedEffect<SuccessTestEffect>, boolean>(),
    toggleEffect: (effect: SourcedEffect<SuccessTestEffect>) => {
      this.update(({ modifiers: { effects } }) => {
        effects.set(effect, !effects.get(effect));
      });
    },
    simple: new Map<number, SuccessTestModifier>(),
    toggleSimple: (modifier: SuccessTestModifier) => {
      this.update(({ modifiers: { simple } }) => {
        simple.delete(modifier.id) || simple.set(modifier.id, modifier);
      });
    },
  };

  readonly skillState: {
    skill: Skill;
    applySpecialization: boolean;
    replaceSkill: (newSkill: Skill) => void;
    toggleSpecialization: () => void;
  };

  constructor({ ego, skill, character, token, action }: SkillTestInit) {
    this.ego = ego;
    this.character = character;
    this.token = token;

    this.action = {
      ...(action ?? createAction({ type: ActionType.Quick })),
      modifier: createSuccessTestModifier(),
      update: (changed) => {
        this.update((draft) => {
          draft.action = merge(
            draft.action,
            updateAction(draft.action, changed),
          );

          const { timeMod, modifier } = draft.action;

          if (timeMod) {
            modifier.value = timeMod < 0 ? timeMod * 20 : timeMod * 10;
            modifier.name = `${localize(
              timeMod < 0 ? 'rushing' : 'takingTime',
            )} x${Math.abs(timeMod)}`;
            draft.modifiers.simple.set(modifier.id, modifier);
          } else draft.modifiers.simple.delete(modifier.id);
        });
      },
    };

    this.skillState = {
      skill,
      applySpecialization: false,
      toggleSpecialization: () => {
        this.update(({ skillState }) => {
          skillState.applySpecialization = !skillState.applySpecialization;
        });
      },
      replaceSkill: (newSkill) => {
        this.update((draft) => {
          const { skillState, pools } = draft;
          skillState.skill = newSkill;
          skillState.applySpecialization = false;
          if (this.character) {
            const poolMap = this.character.pools;
            pools.available = compact(
              this.ego.useThreat
                ? [poolMap.get(PoolType.Threat)]
                : [
                    poolMap.get(Pool.linkedToAptitude(newSkill.linkedAptitude)),
                    poolMap.get(PoolType.Flex),
                  ],
            );
          } else pools.available = [];
          this.togglePool(draft, null);
        });
      },
    };
  }

  private togglePool(
    { pools, modifiers }: Draft<this>,
    pair: PreTestPool | null,
  ) {
    const id = pools.active?.[0].testModifier.id;
    if (id != null) modifiers.simple.delete(id);

    pools.active = equals(pools.active, pair) ? null : pair;
    if (pools.active?.[1] === PreTestPoolAction.Bonus) {
      const { testModifier } = pools.active[0];
      modifiers.simple.set(testModifier.id, testModifier);
    }
  }

  get ignoreModifiers() {
    return this.pools.active?.[1] === PreTestPoolAction.IgnoreMods;
  }

  @LazyGetter()
  get modifierTotal() {
    return [...this.modifiers.effects].reduce(
      (accum, [effect, active]) => accum + (active ? effect.modifier : 0),
      [...this.modifiers.simple.values()].reduce(
        (accum, { value }) => accum + value,
        0,
      ),
    );
  }

  get total() {
    const { skill, applySpecialization } = this.skillState;
    const base = skill.total + (applySpecialization ? 10 : 0);
    return base + (this.ignoreModifiers ? 0 : this.modifierTotal);
  }

  private update(recipe: Draft<this> | ((recipe: Draft<this>) => void)) {
    const [nextState, patches, inversePatches] = produceWithPatches(
      this.state.value,
      typeof recipe === 'function' ? recipe : () => recipe,
    );
    console.log(patches);
    this.state.next(nextState);
  }
}
