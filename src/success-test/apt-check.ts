import {
  MessageVisibility,
  rollModeToVisibility,
} from '@src/chat/create-message';
import { AptitudeType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  Action,
  ActionType,
  createAction,
  defaultCheckActionSubtype,
  updateAction,
} from '@src/features/actions';
import produce, { immerable } from 'immer';
import { Observable } from 'rxjs';
import { createSuccessTestModifier, SimpleSuccessTestModifier } from './success-test';
import { CoolStore } from 'cool-store';
import { merge } from 'remeda';
import { localize } from '@src/foundry/localization';

export type AptitudeCheckInit = {
  ego: Ego;
  aptitude?: AptitudeType;
  character?: Character;
  token?: MaybeToken;
  action?: Action;
};

type CheckState = {
  aptitude: {
    type: AptitudeType;
    multiplier: number;
  };

  settings: {
    visibility: MessageVisibility;
    autoRoll: boolean;
  };

  action: Action & {
    update: (changed: Partial<Action>) => void;
    modifier: SimpleSuccessTestModifier;
  };
  modifiers: Set<SimpleSuccessTestModifier>;
};

export class AptCheck {
  [immerable] = true;

  readonly ego;
  readonly character;
  readonly token;

  state: CoolStore<CheckState>;

  constructor({
    ego,
    aptitude = AptitudeType.Willpower,
    character,
    token,
    action,
  }: AptitudeCheckInit) {
    this.ego = ego;
    this.character = character;
    this.token = token;
    this.state = new CoolStore({
      aptitude: {
        type: aptitude,
        multiplier: 3,
      },
      settings: {
        visibility: rollModeToVisibility(game.settings.get('core', 'rollMode')),
        autoRoll: true,
      },
      action: {
        ...(action ??
          createAction({
            type: ActionType.Automatic,
            subtype: defaultCheckActionSubtype(aptitude),
          })),
        modifier: createSuccessTestModifier({ name: localize("action"), value: 0}),
        update: (changed: Partial<Action>) => {
          this.state.set((recipe) => {
            recipe.action = merge(
              recipe.action,
              updateAction(recipe.action, changed),
            );
          });
        },
      },
      modifiers: new Set(),
    }) as CoolStore<CheckState>;
  }
}
