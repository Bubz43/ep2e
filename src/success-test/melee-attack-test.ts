import { createMessage } from '@src/chat/create-message';
import type { SuccessTestMessageData } from '@src/chat/message-data';
import type { AttackType } from '@src/combat/attacks';
import { SuperiorResultEffect, WeaponAttackType } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import type { MeleeWeaponSettings } from '@src/entities/weapon-settings';
import { actionTimeframeModifier, ActionType } from '@src/features/actions';
import { complementarySkillBonus } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { arrayOf } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { compact, createPipe, last, merge, pick } from 'remeda';
import type { SetRequired } from 'type-fest';
import { SkillTest, SkillTestInit } from './skill-test';
import { grantedSuperiorResultEffects, rollSuccessTest } from './success-test';

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
    const { settings, pools, action, melee, testMessageData } = this;

    const { weapon, primaryAttack, ...meleeSettings } = melee;

    await createMessage({
      data: {
        header: {
          heading: this.name,
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
        successTest: {
          ...testMessageData,
          superiorResultEffects: arrayOf({
            value: SuperiorResultEffect.Damage,
            length: grantedSuperiorResultEffects(last(testMessageData.states)?.result),
          }),
          defaultSuperiorEffect: SuperiorResultEffect.Damage,
        },
        meleeAttack: {
          weapon: weapon.getDataCopy(),
          attackType: primaryAttack ? 'primary' : 'secondary',
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
