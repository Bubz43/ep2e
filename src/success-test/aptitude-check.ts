import { createMessage } from '@src/chat/create-message';
import type { SuccessTestMessage } from '@src/chat/message-data';
import {
  attachWindow,
  WindowController,
} from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { AptitudeType, PoolType } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import {
  Action,
  ActionType,
  createAction,
  defaultCheckActionSubtype,
} from '@src/features/actions';
import {
  matchesAptitude,
  Source,
  SuccessTestEffect,
} from '@src/features/effects';
import { stringID } from '@src/features/feature-helpers';
import { Pool, PreTestPoolAction } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import { overlay } from '@src/init';
import { debounce } from '@src/utility/decorators';
import { html } from 'lit-html';
import { compact, equals, map } from 'remeda';
import { traverseActiveElements } from 'weightless';
import { rollSuccessTest, SuccessTestModifier } from './success-test';

export type AptitudeCheckInit = {
  ego: Ego;
  aptitude?: AptitudeType;
  character?: Character;
  token?: MaybeToken;
  action?: Action;
};

const eventKey = `aptitude-check-${stringID()}`;

type WinState = {
  unsub?: () => void;
  called: boolean;
  controller?: WindowController<{ check: AptitudeCheck }>;
  open?: (actor: ActorEP | null) => void;
  readonly relative: Element | null;
  cleanup: () => void;
};

export class AptitudeCheck extends EventTarget {
  readonly ego;
  readonly character;
  readonly token;
  readonly state: {
    aptitude: AptitudeType;
    halve: boolean;
  };
  readonly action: Action;

  readonly activeEffects = new WeakSet<SuccessTestEffect>();
  activePool: Readonly<[Pool, PreTestPoolAction]> | null = null;
  modifiers = new Set<SuccessTestModifier>();

  constructor({ ego, aptitude, character, token, action }: AptitudeCheckInit) {
    super();
    this.ego = ego;
    this.character = character;
    this.token = token;

    this.state = this.createNotifying({
      aptitude: aptitude || AptitudeType.Willpower,
      halve: false,
    });

    this.action = this.createNotifying(
      action ??
        createAction({
          type: ActionType.Automatic,
          subtype: defaultCheckActionSubtype(this.state.aptitude),
        }),
    );
  }

  toggleModifier(modifier: SuccessTestModifier) {
    this.modifiers.delete(modifier) || this.modifiers.add(modifier);
    this.notify;
  }

  toggleActivePool(active: AptitudeCheck['activePool']) {
    const poolMod = this.activePool?.[0].testModifier;
    poolMod && this.toggleModifier(poolMod);
    this.activePool = equals(active, this.activePool) ? null : active;
    if (this.activePool?.[1] === PreTestPoolAction.Bonus)
      this.toggleModifier(this.activePool[0].testModifier);
    this.notify();
  }

  toggleActiveEffect(effect: SuccessTestEffect) {
    this.activeEffects.delete(effect) || this.activeEffects.add(effect);
    this.notify();
  }

  get aptitudeTotal() {
    const { aptitude, halve } = this.state;
    const base = this.ego.aptitudes[aptitude] * 3;
    return halve ? Math.round(base / 2) : base;
  }

  get pools() {
    const pools: Pool[] = [];
    if (!this.character) return pools;
    const poolMap = this.character.pools;
    if (this.ego.useThreat) {
      const threat = poolMap.get(PoolType.Threat);
      if (threat) pools.push(threat);
    } else {
      const linked = Pool.linkedToAptitude(this.state.aptitude);
      pools.push(...compact([poolMap.get(linked), poolMap.get(PoolType.Flex)]));
    }
    return pools;
  }

  get modifierEffects() {
    return (
      this.character?.appliedEffects.getMatchingSuccessTestEffects(
        matchesAptitude(this.state.aptitude)(this.action),
        false,
      ) ?? []
    );
  }

  get ignoreMods() {
    return this.activePool?.[1] === PreTestPoolAction.IgnoreMods;
  }

  get target() {
    return this.aptitudeTotal + (this.ignoreMods ? 0 : this.totalModifiers);
  }

  get totalModifiers() {
    return (
      this.modifierEffects.reduce(
        (accum, effect) =>
          accum +
          (effect.requirement && !this.activeEffects.has(effect)
            ? 0
            : effect.modifier),
        0,
      ) + [...this.modifiers].reduce((accum, { value }) => accum + value, 0)
    );
  }

  get messageData(): SuccessTestMessage {
    const { roll, result, target } = rollSuccessTest({ target: this.target });
    return {
      parts: [
        { name: localize(this.state.aptitude), value: this.aptitudeTotal },
        ...this.modifierEffects.flatMap(
          (effect) =>
            !effect.requirement || this.activeEffects.has(effect)
              ? { name: effect[Source], value: effect.modifier }
              : [],
          ...this.modifiers,
        ),
      ],
      roll,
      result,
      target,
    };
  }

  updateState = (newState: Partial<AptitudeCheck['state']>) => {
    Object.assign(this.state, newState);
  };

  updateAction = (newAction: Partial<Action>) => {
    Object.assign(this.action, newAction);
  };

  subscribe(cb: (test: this) => void) {
    const handler = () => cb(this);
    this.addEventListener(eventKey, handler);
    cb(this);
    return () => this.removeEventListener(eventKey, handler);
  }

  @debounce(1)
  private notify() {
    this.dispatchEvent(new CustomEvent(eventKey));
  }

  private createNotifying<T extends { [key: string]: unknown }>(obj: T) {
    return new Proxy(
      { ...obj },
      {
        set: (obj, prop, value) => {
          const set = Reflect.set(obj, prop, value);
          this.notify();
          return set;
        },
      },
    );
  }

  private static winStates = new WeakMap<ActorEP, WinState>();

  static openWindow(aptitude: AptitudeType, actor: ActorEP) {
    const state = this.winStates.get(actor);
    if (state) {
      state.called = true;
      state.open?.(actor);
    } else {
      const state: WinState = {
        called: true,
        cleanup() {
          AptitudeCheck.winStates.delete(actor);
          this.unsub?.();
          delete this.controller;
        },
        get relative() {
          return this.called ? traverseActiveElements() : null;
        },
      };
      AptitudeCheck.winStates.set(actor, state);

      state.open = (actor: ActorEP | null) => {
        if (actor?.proxy.type !== ActorType.Character) {
          state.controller?.win.close();
          return;
        }
        const { proxy: character } = actor;
        const check = new AptitudeCheck({
          ego: character.ego,
          aptitude,
          character,
        });

        if (!state.controller) {
          state.controller = attachWindow({
            name: `${localize('successTest')} - ${localize('aptitudeCheck')}`,
            resizable: ResizeOption.Vertical,
            renderTemplate: ({ check }) => html`
              <aptitude-check-controls
                .test=${check}
                @test-completed=${() => {
                  state.controller?.win.close();
                  // TODO pools and actions and other nonsense
                  createMessage({
                    data: {
                      header: {
                        heading: `${localize("FULL", check.state.aptitude)} ${localize(
                          'check',
                        )}`,
                        subheadings: [
                          map(
                            [check.action.type, check.action.subtype, 'action'],
                            localize,
                          ).join(' '),
                        ],
                      },
                      successTest: check.messageData,
                    },
                    entity: character,
                  });
                }}
              ></aptitude-check-controls>
            `,
            renderProps: { check },
            cleanup: () => state.cleanup(),
            relativeElement: state.relative,
          });
        } else {
          state.controller.update({
            renderProps: { check },
            relativeElement: state.relative,
          });
        }
      };

      state.unsub = actor.subscribe(state.open);
    }
  }
}
