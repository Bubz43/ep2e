import { createMessage } from '@src/chat/create-message';
import type { SuccessTestMessageData } from '@src/chat/message-data';
import { SuperiorResultEffect } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Software } from '@src/entities/item/proxies/software';
import { actionTimeframeModifier, ActionType } from '@src/features/actions';
import { localize } from '@src/foundry/localization';
import { arrayOf } from '@src/utility/helpers';
import { compact, last } from 'remeda';
import { grantedSuperiorResultEffects, rollSuccessTest } from './success-test';
import { SuccessTestBase } from './success-test-base';

export interface SoftwarkSkillTestInit {
  software: Software;
  character: Character;
  skill: Software['skills'][number];
}

export class SoftwareSkillTest extends SuccessTestBase {
  get basePoints(): number {
    return (
      this.skillState.skill.total +
      (this.skillState.applySpecialization ? 10 : 0)
    );
  }

  readonly software: Software;
  readonly character: Character;

  readonly skillState: {
    skill: SoftwarkSkillTestInit['skill'];
    applySpecialization: boolean;
    toggleSpecialization: () => void;
  };

  constructor({ software, character, skill }: SoftwarkSkillTestInit) {
    super();
    this.software = software;
    this.character = character;
    this.skillState = {
      skill,
      applySpecialization: false,
      toggleSpecialization: () => {
        this.update(({ skillState }) => {
          skillState.applySpecialization = !skillState.applySpecialization;
        });
      },
    };
  }

  get name() {
    return `${this.skillState.skill.name} ${localize('test')}`;
  }

  protected get testMessageData(): SuccessTestMessageData {
    const {
      ignoreModifiers,
      clampedTarget,
      skillState,
      settings,
      pools,
      action,
    } = this;
    const { skill, applySpecialization } = skillState;

    const data: SuccessTestMessageData = {
      parts: compact([
        {
          name: `${skillState.skill.name}`,
          value: skillState.skill.total,
        },
        applySpecialization && {
          name: `[${localize('specialization')}] ${skill.specialization}`,
          value: 10,
        },
        ...(ignoreModifiers ? [] : this.modifiersAsParts),
      ]),
      states: [
        {
          target: clampedTarget,
          ...(settings.autoRoll
            ? rollSuccessTest({ target: clampedTarget })
            : {}),
          action: pools.active
            ? [pools.active[0].type, pools.active[1]]
            : 'initial',
        },
      ],
      ignoredModifiers: ignoreModifiers ? this.modifierTotal : undefined,
      task: action.timeframe
        ? {
            name: this.name,
            timeframe: action.timeframe,
            actionSubtype: action.subtype,
            modifiers: [actionTimeframeModifier(action)].flatMap((p) =>
              p.modifier ? { ...p, modifier: p.modifier * 100 } : [],
            ),
          }
        : undefined,
    };
    if (data.task) {
      (data.defaultSuperiorEffect = SuperiorResultEffect.Time),
        (data.superiorResultEffects = arrayOf({
          value: SuperiorResultEffect.Time,
          length: grantedSuperiorResultEffects(last(data.states)?.result),
        }));
    }
    return data;
  }

  protected createMessage() {
    const { software, skillState, character, settings, action } = this;

    createMessage({
      data: {
        header: {
          heading: this.name,
          subheadings: compact([
            software.name,
            [
              `${action.type} ${
                action.timeMod && action.type !== ActionType.Task
                  ? `(${localize('as')} ${localize('task')})`
                  : ''
              }`,
              localize(action.subtype),
              localize('action'),
            ].join(' '),
          ]),
        },
        successTest: this.testMessageData,
      },
      entity: character,
      visibility: settings.visibility,
    });
  }
}
