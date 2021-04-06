import { rollModeToVisibility } from '@src/chat/create-message';
import {
  Action,
  ActionSubtype,
  ActionType,
  createAction,
  updateAction,
} from '@src/features/actions';
import { Source } from '@src/features/effects';
import { PreTestPoolAction } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import type { WithUpdate } from '@src/utility/updating';
import { Draft, immerable, produce } from 'immer';
import { equals, merge, pick } from 'remeda';
import { BehaviorSubject } from 'rxjs';
import {
  createSuccessTestModifier,
  PreTestPool,
  SimpleSuccessTestModifier,
  SuccessTestModifiers,
  SuccessTestPools,
  SuccessTestSettings,
  successTestTargetClamp,
} from './success-test';

export type SuccessTestInit = {
  action?: Action;
};

export abstract class SuccessTestBase {
  abstract get basePoints(): number;
  protected abstract createMessage(): void | Promise<void>;
  readonly [immerable] = true;

  readonly fullMoveModifier = createSuccessTestModifier({
    name: localize('fullMove'),
    value: -20,
  });

  private readonly state = new BehaviorSubject(this);
  readonly subscribe = this.state.subscribe.bind(this.state);

  protected update(recipe: Draft<this> | ((recipe: Draft<this>) => void)) {
    const nextState = produce(
      this.state.value,
      typeof recipe === 'function' ? recipe : () => recipe,
    );

    if (nextState.settings.ready) {
      this.state.complete();
      nextState.createMessage();
    } else this.state.next(nextState);
  }

  readonly settings: WithUpdate<SuccessTestSettings> = {
    visibility: rollModeToVisibility(game.settings.get('core', 'rollMode')),
    autoRoll: true,
    ready: false,
    update: this.recipe(
      (draft, changed) =>
        void (draft.settings = merge(draft.settings, changed)),
    ),
    setReady: () => this.update(({ settings }) => void (settings.ready = true)),
  };

  readonly pools: SuccessTestPools = {
    available: [],
    active: null,
    toggleActive: this.recipe((draft, pair) => this.togglePool(draft, pair)),
  };
  readonly action: WithUpdate<Action & { fullMove: boolean }> & {
    modifier: SimpleSuccessTestModifier;
  };
  readonly modifiers: SuccessTestModifiers = {
    effects: new Map(),
    toggleEffect: this.recipe(
      ({ modifiers: { effects } }, effect) =>
        void effects.set(effect, !effects.get(effect)),
    ),
    simple: new Map(),
    toggleSimple: this.recipe(({ modifiers: { simple } }, modifier) => {
      console.log('toggle simple', simple.has(modifier.id));
      if (simple.has(modifier.id)) simple.delete(modifier.id);
      else simple.set(modifier.id, modifier);
    }),
  };

  get target() {
    return this.basePoints + (this.ignoreModifiers ? 0 : this.modifierTotal);
  }

  get clampedTarget() {
    return successTestTargetClamp(this.target);
  }

  get ignoreModifiers() {
    return this.pools.active?.[1] === PreTestPoolAction.IgnoreMods;
  }

  get modifiersAsParts() {
    const { effects, simple } = this.modifiers;
    return [
      ...[...effects].flatMap(([effect, active]) =>
        active ? { name: effect[Source], value: effect.modifier } : [],
      ),
      ...[...simple.values()].map(pick(['name', 'value'])),
    ];
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
      fullMove: false,
      modifier: createSuccessTestModifier(),
      update: this.recipe(
        (draft, changed) => void this.updateAction(draft, changed),
      ),
    };
  }

  protected updateAction(draft: Draft<this>, changed: Partial<Action>) {
    draft.action = merge(draft.action, updateAction(draft.action, changed));

    draft.action.fullMove &&= draft.action.subtype === ActionSubtype.Physical;

    const { timeMod, modifier, fullMove } = draft.action;
    if (timeMod) {
      modifier.value = timeMod < 0 ? timeMod * 20 : timeMod * 10;
      modifier.name = `${localize(
        timeMod < 0 ? 'rushing' : 'takingTime',
      )} x${Math.abs(timeMod)}`;
      draft.modifiers.simple.set(modifier.id, modifier);
    } else draft.modifiers.simple.delete(modifier.id);

    if (fullMove) {
      draft.modifiers.simple.set(
        this.fullMoveModifier.id,
        this.fullMoveModifier,
      );
    } else draft.modifiers.simple.delete(this.fullMoveModifier.id);
  }

  protected togglePool(
    { pools, modifiers }: Draft<this>,
    pair: PreTestPool | null,
  ) {
    const id = pools.active?.[0].testModifier.id;
    if (id != null) modifiers.simple.delete(id);

    pools.active =
      pair?.[0].type === pools.active?.[0].type &&
      equals(pair?.[1], pools.active?.[1])
        ? null
        : pair;
    if (pools.active?.[1] === PreTestPoolAction.Bonus) {
      const { testModifier } = pools.active[0];
      modifiers.simple.set(testModifier.id, testModifier);
    }
  }

  protected recipe<T>(cb: (draft: Draft<this>, ...args: T[]) => void) {
    return (...args: T[]) => this.update((draft) => void cb(draft, ...args));
  }
}
