import { rollModeToVisibility } from '@src/chat/create-message';
import { PoolType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  Action,
  ActionType,
  createAction,
  updateAction
} from '@src/features/actions';
import {
  matchesSkill,
  SourcedEffect,
  SuccessTestEffect
} from '@src/features/effects';
import { Pool, PreTestPoolAction } from '@src/features/pool';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import type { WithUpdate } from '@src/utility/updating';
import { immerable, produceWithPatches } from 'immer';
import type { Draft } from 'immer/dist/internal';
import { compact, equals, merge } from 'remeda';
import { BehaviorSubject } from 'rxjs';
import {
  createSuccessTestModifier,
  PreTestPool,
  SimpleSuccessTestModifier,
  SuccessTestModifiers,
  SuccessTestPools,
  SuccessTestSettings
} from './success-test';

export type SkillTestInit = {
  ego: Ego;
  skill: Skill;
  character?: Character;
  token?: MaybeToken;
  action?: Action;
};

class SuccessTest {
  readonly [immerable] = true;

  private readonly state = new BehaviorSubject(this);
  readonly subscribe = this.state.subscribe.bind(this.state);

  protected update(recipe: Draft<this> | ((recipe: Draft<this>) => void)) {
    const [nextState, patches, inversePatches] = produceWithPatches(
      this.state.value,
      typeof recipe === 'function' ? recipe : () => recipe,
    );
    console.log(patches);
    this.state.next(nextState);
  }
}

export class SkillTest extends SuccessTest {

  readonly ego;
  readonly character;
  readonly token;

  readonly pools: SuccessTestPools;
  readonly modifiers: SuccessTestModifiers;
  readonly action: WithUpdate<Action> & { modifier: SimpleSuccessTestModifier };
  readonly settings: WithUpdate<SuccessTestSettings> = {
    visibility: rollModeToVisibility(game.settings.get('core', 'rollMode')),
    autoRoll: true,
    update: (changed) => {
      this.update((recipe) => {
        recipe.settings = merge(recipe.settings, changed);
      });
    },
  };

  readonly skillState: {
    skill: Skill;
    applySpecialization: boolean;
    replaceSkill: (newSkill: Skill) => void;
    toggleSpecialization: () => void;
  };

  get ignoreModifiers() {
    return this.pools.active?.[1] === PreTestPoolAction.IgnoreMods;
  }

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

  constructor({ ego, skill, character, token, action }: SkillTestInit) {
    super();
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
          pools.available = this.getPools(newSkill);
          this.togglePool(draft, null);
        });
      },
    };

    this.pools = {
      available: this.getPools(this.skillState.skill),
      active: null,
      toggleActive: (pair) => {
        this.update((draft) => this.togglePool(draft, pair));
      },
    };

    this.modifiers = {
      effects: this.getModifierEffects(this.skillState.skill, this.action),
      toggleEffect: (effect: SourcedEffect<SuccessTestEffect>) => {
        this.update(({ modifiers: { effects } }) => {
          effects.set(effect, !effects.get(effect));
        });
      },
      simple: new Map<number, SimpleSuccessTestModifier>(),
      toggleSimple: (modifier: SimpleSuccessTestModifier) => {
        this.update(({ modifiers: { simple } }) => {
          simple.delete(modifier.id) || simple.set(modifier.id, modifier);
        });
      },
    };
  }

  private getModifierEffects(skill: Skill, action: Action) {
    return new Map(
      (
        this.character?.appliedEffects.getMatchingSuccessTestEffects(
          matchesSkill(skill)(action),
          false,
        ) || []
      ).map((effect) => [effect, false]),
    );
  }

  private getPools(skill: Skill) {
    const poolMap = this.character?.pools;
    return compact(
      this.ego.useThreat
        ? [poolMap?.get(PoolType.Threat)]
        : [
            poolMap?.get(Pool.linkedToAptitude(skill.linkedAptitude)),
            poolMap?.get(PoolType.Flex),
          ],
    );
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
}
