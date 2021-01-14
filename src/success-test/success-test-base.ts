import { rollModeToVisibility } from '@src/chat/create-message';
import {
  Action,
  ActionType,
  createAction,
  updateAction,
} from '@src/features/actions';
import type { SourcedEffect, SuccessTestEffect } from '@src/features/effects';
import { PreTestPoolAction } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import type { WithUpdate } from '@src/utility/updating';
import { immerable, Draft, produceWithPatches } from 'immer';
import { equals, merge } from 'remeda';
import { BehaviorSubject } from 'rxjs';
import {
  createSuccessTestModifier,
  PreTestPool,
  SimpleSuccessTestModifier,
  SuccessTestModifiers,
  SuccessTestPools,
  SuccessTestSettings,
} from './success-test';

export type SuccessTestInit = {
  action?: Action;
};

export abstract class SuccessTestBase {
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
  readonly action: WithUpdate<Action> & { modifier: SimpleSuccessTestModifier };
  readonly modifiers: SuccessTestModifiers = {
    effects: new Map(),
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

  abstract get basePoints(): number;

  get total() {
    return this.basePoints + (this.ignoreModifiers ? 0 : this.modifierTotal);
  }

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

  constructor({ action }: SuccessTestInit = {}) {
    this.action = {
      ...(action ?? createAction({ type: ActionType.Automatic })),
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
  }

  protected togglePool(
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
