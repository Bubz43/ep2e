import { AptitudeType, PoolType } from '@src/data-enums';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import {
  Action,
  ActionType,
  createAction,
  defaultCheckActionSubtype
} from '@src/features/actions';
import { matchesAptitude, SuccessTestEffect } from '@src/features/effects';
import { stringID } from '@src/features/feature-helpers';
import { Pool, PreTestPoolAction } from '@src/features/pool';
import { overlay } from '@src/init';
import { debounce } from '@src/utility/decorators';
import { compact, equals } from 'remeda';
import AptitudeCheckPopout from "./components/AptitudeCheckPopout.svelte";
import type { SuccessTestModifier } from './success-test';

export type AptitudeCheckInit = {
  ego: Ego;
  aptitude?: AptitudeType;
  character?: Character;
  token?: MaybeToken;
  action?: Action;
};

const eventKey = `aptitude-check-${stringID()}`;

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

  addModifier(modifier: SuccessTestModifier) {
    this.modifiers.add(modifier);
    this.notify()
  }

  removeModifier(modifier: SuccessTestModifier) {
    this.modifiers.delete(modifier);
    this.notify()
  }

  toggleActivePool(active: AptitudeCheck['activePool']) {
    const poolMod = this.activePool?.[0].testModifier;
    poolMod && this.removeModifier(poolMod)
    this.activePool = equals(active, this.activePool) ? null : active;
    if (this.activePool?.[1] === PreTestPoolAction.Bonus)
      this.addModifier(this.activePool[0].testModifier)
    this.notify();
  }

  toggleActiveEffect(effect: SuccessTestEffect) {
    if (this.activeEffects.has(effect)) this.activeEffects.delete(effect);
    else this.activeEffects.add(effect);
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
    return this.modifierEffects.reduce(
      (accum, effect) =>
        accum +
        (effect.requirement && !this.activeEffects.has(effect)
          ? 0
          : effect.modifier),
      0,
    ) + [...this.modifiers].reduce((accum, { value }) => accum + value, 0)
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

  private static winUnsub: (() => void) | null = null;
  private static called = false;
  private static popout?: AptitudeCheckPopout | null = null;
  static openWindow(aptitude: AptitudeType, actor: ActorEP) {

    
    AptitudeCheck.called = true;
    AptitudeCheck.winUnsub?.();
    const open = (actor: ActorEP | null) => {
      if (actor?.proxy.type === ActorType.Character) {
        const { proxy: character } = actor;
        const check = new AptitudeCheck({
          ego: character.ego,
          aptitude,
          character,
        });
        if (!this.popout) {
          this.popout = new AptitudeCheckPopout({
            target: overlay,
            props: { check, cleanup: () => {
              this.popout?.$destroy()
              this.winUnsub?.();
              this.popout = null
              this.winUnsub = null
            } }
          })
        } else this.popout.$set({ check })
     
        // const { win, wasConnected } = openWindow(
        //   {
        //     name: `${localize('successTest')} - ${localize('aptitudeCheck')}`,
        //     key: AptitudeCheck,
        //     content: html`<aptitude-check-controls
        //       @test-completed=${() => closeWindow(AptitudeCheck)}
        //       .test=${check}
        //     ></aptitude-check-controls>`,
        //     adjacentEl: AptitudeCheck.called ? traverseActiveElements() : null,
        //   },
        //   { resizable: ResizeOption.Vertical },
        // );
        // AptitudeCheck.called = false;

        // if (!wasConnected) {
        //   win.addEventListener(
        //     SlWindowEventName.Closed,
        //     () => {
        //       console.log('moop');
        //       AptitudeCheck.winUnsub?.();
        //       AptitudeCheck.winUnsub = null;
        //     },
        //     { once: true },
        //   );
        // }
      } else {
        // this.winUnsub?.();
        this.popout?.$set({ close: true })

        // closeWindow(AptitudeCheck);
      }
    };
    AptitudeCheck.winUnsub = actor.subscribe(open);
  }
}
