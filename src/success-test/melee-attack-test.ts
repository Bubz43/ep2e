import { createMessage } from '@src/chat/create-message';
import type { SuccessTestMessageData } from '@src/chat/message-data';
import type { AttackType } from '@src/combat/attacks';
import type { WeaponAttackType } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import type { MeleeWeaponSettings } from '@src/entities/weapon-settings';
import { actionTimeframeModifier, ActionType } from '@src/features/actions';
import { complementarySkillBonus } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import type { WithUpdate } from '@src/utility/updating';
import { compact, createPipe, merge, pick } from 'remeda';
import type { SetRequired } from 'type-fest';
import { SkillTest, SkillTestInit } from './skill-test';
import { rollSuccessTest } from './success-test';

export type MeleeAttackTestInit = SetRequired<SkillTestInit, 'character'> & {
  meleeWeapon: MeleeWeapon;
  primaryAttack: boolean;
};

export class MeleeAttackTest extends SkillTest {
  readonly melee: WithUpdate<
    MeleeWeaponSettings & {
      weapon: MeleeWeapon;
      primaryAttack: boolean;
    }
  >;

  readonly character: Character;

  constructor({ meleeWeapon, primaryAttack, ...init }: MeleeAttackTestInit) {
    super(init);
    this.character = init.character;
    this.melee = {
      weapon: meleeWeapon,
      primaryAttack,
      update: this.recipe((draft, changed) => {
        draft.melee = merge(draft.melee, changed);
        if (changed.weapon) draft.melee.primaryAttack = true;
      }),
    };
  }

  protected async createMessage() {
    const {
      ignoreModifiers,
      clampedTarget,
      skillState,
      settings,
      pools,
      action,
      melee,
    } = this;
    const {
      skill,
      applySpecialization,
      aptitudeMultiplier,
      halveBase,
      complementarySkill,
    } = skillState;

    const { weapon, primaryAttack, ...meleeSettings } = melee;

    const name = `${skill.name} ${localize('test')}`;

    const data: SuccessTestMessageData = {
      parts: compact([
        {
          name: `${skillState.skill.name} ${halveBase ? '÷2' : ''}`,
          value: skillState.skill.points,
        },
        {
          name: `${localize(skill.linkedAptitude)} ${
            halveBase ? `(÷2)` : ''
          } x${aptitudeMultiplier}`,
          value: skill.aptitudePoints * aptitudeMultiplier,
        },
        applySpecialization && {
          name: `[${localize('specialization')}] ${skill.specialization}`,
          value: 10,
        },
        complementarySkill && {
          name: `[${localize('complementary')}] ${complementarySkill.name}`,
          value: complementarySkillBonus(complementarySkill),
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
      linkedPool: this.getLinkedPool(skill),
      defaulting: skill.points === 0,

      task: action.timeframe
        ? {
            name,
            timeframe: action.timeframe,
            actionSubtype: action.subtype,
            modifiers: [actionTimeframeModifier(action)].flatMap((p) =>
              p.modifier ? { ...p, modifier: p.modifier * 100 } : [],
            ),
          }
        : undefined,
    };

    await createMessage({
      data: {
        header: {
          heading: name,
          subheadings: [
            `${action.type} ${
              action.timeMod && action.type !== ActionType.Task
                ? `(${localize('as')} ${localize('task')})`
                : ''
            }`,
            localize(action.subtype),
            localize('action'),
          ].join(' '),
        },
        successTest: data,
        meleeAttack: {
          weapon: weapon.getDataCopy(),
          attackType: primaryAttack ? 'primary' : 'secondary',
          useSuccessTest: true,
          ...pick(meleeSettings, [
            'aggressive',
            'charging',
            'extraWeapon',
            'touchOnly',
            'unarmedDV',
          ]),
        },
      },

      entity: this.token ?? this.character, // TODO account for item sources,
      visibility: settings.visibility,
    });

    if (pools.active) {
      this.character?.spendPool({ pool: pools.active[0].type, points: 1 });
    }
  }
}
