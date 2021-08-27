import { createMessage } from '@src/chat/create-message';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Psi } from '@src/entities/item/proxies/psi';
import { ActionSubtype, ActionType, createAction } from '@src/features/actions';
import { localize } from '@src/foundry/localization';
import { createSuccessTestModifier, rollSuccessTest } from './success-test';
import { SuccessTestBase } from './success-test-base';

export type InfectionTestInit = {
  psi: Psi;
  character: Character;
  modifier?: { sleight: string; value: number };
  interference?: boolean;
  token?: MaybeToken;
};

export class InfectionTest extends SuccessTestBase {
  readonly psi;
  readonly character;
  readonly sleightModifier?: InfectionTestInit['modifier'];
  readonly interference;
  readonly token: MaybeToken;

  get basePoints() {
    return this.psi.infectionRating;
  }

  constructor({
    psi,
    modifier,
    character,
    interference,
    token,
  }: InfectionTestInit) {
    super({
      action: createAction({
        type: ActionType.Automatic,
        subtype: ActionSubtype.Mental,
      }),
    });
    this.psi = psi;
    this.character = character;
    this.sleightModifier = modifier;
    this.interference = interference;
    this.token = token;
    if (modifier) {
      const sleightModifier = createSuccessTestModifier({
        name: modifier.sleight,
        value: modifier.value,
      });
      this.modifiers.simple.set(sleightModifier.id, sleightModifier);
    }
    if (interference) {
      const interferenceModifier = createSuccessTestModifier({
        name: localize('interference'),
        value: 30,
      });
      this.modifiers.simple.set(interferenceModifier.id, interferenceModifier);
    }
  }

  async createMessage() {
    const { clampedTarget, settings, interference } = this;
    await createMessage({
      data: {
        header: {
          heading: `${localize('infectionTest')}`,
          subheadings: interference ? localize('interference') : '',
        },
        infectionTest: {
          interference: interference,
        },
        successTest: {
          disableSuperiorEffects: true,
          parts: [
            {
              name: localize('infectionRating'),
              value: this.basePoints,
            },
            ...this.modifiersAsParts,
          ],
          states: [
            {
              target: clampedTarget,
              ...(settings.autoRoll
                ? rollSuccessTest({ target: clampedTarget })
                : {}),
              action: 'initial',
            },
          ],
        },
      },
      entity: this.token || this.character,
      visibility: settings.visibility,
    });
    if (this.sleightModifier) {
      this.psi.updateInfectionRating(
        this.psi.infectionRating + this.sleightModifier.value,
      );
    } else if (interference) {
      this.psi.setCriticalSuccessState('interference', false);
    }
  }
}
