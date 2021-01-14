import { rollModeToVisibility } from '@src/chat/create-message';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  Action,
  ActionType,
  createAction,
  updateAction,
} from '@src/features/actions';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import type { WithUpdate } from '@src/utility/updating';
import { immerable, produce, produceWithPatches } from 'immer';
import type { Draft } from 'immer/dist/internal';
import { merge } from 'remeda';
import { BehaviorSubject } from 'rxjs';
import {
  createSuccessTestModifier,
  SuccessTestModifier,
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

  readonly action: WithUpdate<Action> & { modifier: SuccessTestModifier, color?: number };
  readonly modifiers = new Map<number, SuccessTestModifier>();
  readonly settings: WithUpdate<SuccessTestSettings> = {
    visibility: rollModeToVisibility(game.settings.get('core', 'rollMode')),
    autoRoll: true,
    update: (changed) => {
      this.update((recipe) => {
        recipe.settings = merge(recipe.settings, changed);
      });
    },
  };

  constructor({ ego, skill, character, token, action }: SkillTestInit) {
    this.ego = ego;
    this.character = character;
    this.token = token;

    this.action = {
      ...(action ?? createAction({ type: ActionType.Quick })),
      modifier: createSuccessTestModifier(),
      update: (changed) => {
        this.update((recipe) => {
          recipe.action = merge(
            recipe.action,
            updateAction(recipe.action, changed),
          );

          const { timeMod, modifier } = recipe.action;

          if (recipe.action.timeMod) {
            modifier.value = timeMod < 0 ? timeMod * 20 : timeMod * 10;
            modifier.name = `${localize(
              timeMod < 0 ? 'rushing' : 'takingTime',
            )} x${Math.abs(timeMod)}`;
            recipe.modifiers.set(modifier.id, modifier);
          } else recipe.modifiers.delete(modifier.id);
        });
      },
    };
  }

  private update(recipe: Draft<this> | ((recipe: Draft<this>) => void)) {
    const [nextState, patches, inversePatches] = produceWithPatches(
      this.state.value,
      typeof recipe === 'function' ? recipe : () => recipe,
    );
    console.log(patches)
    this.state.next(
      nextState
    );
  }
}

