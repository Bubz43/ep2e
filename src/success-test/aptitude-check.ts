import { AptitudeType, PoolType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  Action,
  ActionType,
  createAction,
  defaultCheckActionSubtype,
} from '@src/features/actions';
import { matchesAptitude } from '@src/features/effects';
import { stringID } from '@src/features/feature-helpers';
import { Pool } from '@src/features/pool';
import { debounce } from '@src/utility/decorators';
import { compact } from 'remeda';

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
    return this.character?.appliedEffects.getMatchingSuccessTestEffects(
      matchesAptitude(this.state.aptitude)(this.action),
      false,
    ) ?? [];
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
}
