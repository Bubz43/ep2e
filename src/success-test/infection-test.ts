import { createMessage } from '@src/chat/create-message';
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
};

export class InfectionTest extends SuccessTestBase {
  readonly psi;
  readonly character;
  readonly sleightModifier?: InfectionTestInit['modifier'];

  get basePoints() {
    return this.psi.infectionRating;
  }

  constructor({ psi, modifier, character }: InfectionTestInit) {
    super({
      action: createAction({
        type: ActionType.Automatic,
        subtype: ActionSubtype.Mental,
      }),
    });
    this.psi = psi;
    this.character = character;
    this.sleightModifier = modifier;
    if (modifier) {
      const sleightModifier = createSuccessTestModifier({
        name: modifier.sleight,
        value: modifier.value,
      });
      this.modifiers.simple.set(sleightModifier.id, sleightModifier);
    }
  }

  async createMessage() {
    const { clampedTarget, settings } = this;
    await createMessage({
      data: {
        header: {
          heading: `${localize('infectionTest')}`,
        },
        infectionTest: {},
        successTest: {
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
    });
    if (this.sleightModifier) {
      this.psi.updateInfectionRating(
        this.psi.infectionRating + this.sleightModifier.value,
      );
    }
  }
}
