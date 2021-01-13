import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import type { ActorIdentifiers } from '@src/entities/find-entities';
import {
  Action,
  ActionType,
  createAction,
  updateAction,
} from '@src/features/actions';
import type { FullSkill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { debounce } from '@src/utility/decorators';
import { LazyGetter } from 'lazy-get-decorator';
import type { SuccessTestModifier } from './success-test';

export type SkillTestInit = {
  skill: FullSkill;
  ego: Ego;
  character?: Character;
  token?: MaybeToken;
  action?: Action;
};

export class SkillTest {
  readonly ego;
  readonly character;
  readonly token;

  readonly actionState: Action & { update: (change: Partial<Action>) => void };

  private subs = new Set<(test: this) => void>();
  private modifierState = {
    modifiers: new Set<SuccessTestModifier>(),
  };

  constructor({ skill, ego, character, token, action }: SkillTestInit) {
    this.ego = ego;
    this.character = character;
    this.token = token;

    type X = ActorIdentifiers

    this.actionState = {
      ...(action ?? createAction({ type: ActionType.Quick })), // TODO figure out better default
      update: (change: Partial<Action>) => {
        Object.assign(this.actionState, updateAction(this.actionState, change));
        this.notify();
        if (this.actionState.timeMod) {
          const { timeMod } = this.actionState;
          const { modifierFromAction } = this;
          modifierFromAction.value = timeMod < 0 ? timeMod * 20 : timeMod * 10;
          modifierFromAction.name = `${localize(
            timeMod < 0 ? 'rushing' : 'takingTime',
          )} x${Math.abs(timeMod)}`;
          this.modifierState.modifiers.add(modifierFromAction);
        } else this.modifierState.modifiers.delete(this.modifierFromAction);
      },
    };
  }

  @LazyGetter()
  private get modifierFromAction(): SuccessTestModifier {
    const { actionState } = this;
    return {
      get name() {
        return `${localize(
          actionState.timeMod < 0 ? 'rushing' : 'takingTime',
        )} x${Math.abs(actionState.timeMod)}`;
      },
      get value() {
        const { timeMod } = actionState;
        return timeMod < 0 ? timeMod * 20 : timeMod * 10;
      },
    };
  }

  subscribe(cb: (test: this) => void) {
    this.subs.add(cb);
    cb(this);
    return () => void this.subs.delete(cb);
  }

  @debounce(50)
  private notify() {
    for (const callback of this.subs) {
      callback(this);
    }
  }

  private createNotifying<T extends { [key: string]: unknown }>(
    obj: T,
    onChange?: () => void,
  ) {
    const proxy = new Proxy(
      {
        ...obj,
        update: (changed: Partial<T>) => {
          Object.assign(proxy, changed);
          onChange?.();
        },
      },
      {
        set: (obj, prop, value) => {
          const set = Reflect.set(obj, prop, value);
          this.notify();
          return set;
        },
      },
    );
    return proxy;
  }
}
