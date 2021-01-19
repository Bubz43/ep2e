import { createMessage } from '@src/chat/create-message';
import { SuperiorResultEffect } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import type { MeleeWeaponSettings } from '@src/entities/weapon-settings';
import { Action, ActionType } from '@src/features/actions';
import { matchesSkill, Source } from '@src/features/effects';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { arrayOf } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { last, merge, pick } from 'remeda';
import type { SetRequired } from 'type-fest';
import { SkillTest, SkillTestInit } from './skill-test';
import { grantedSuperiorResultEffects } from './success-test';

export type MeleeAttackTestInit = SetRequired<SkillTestInit, 'character'> & {
  meleeWeapon: MeleeWeapon;
  primaryAttack: boolean;
};

export class MeleeAttackTest extends SkillTest {
  readonly melee: WithUpdate<
    MeleeWeaponSettings & {
      weapon: MeleeWeapon;
      primaryAttack: boolean;
      attackTarget?: Token | null;
    }
  >;

  readonly character: Character;

  constructor({ meleeWeapon, primaryAttack, ...init }: MeleeAttackTestInit) {
    super(init);
    this.character = init.character;
    this.melee = {
      weapon: meleeWeapon,
      primaryAttack,
      attackTarget: [...game.user.targets][0], // TODO get closest to token
      update: this.recipe((draft, changed) => {
        draft.melee = merge(draft.melee, changed);
        if (changed.weapon) draft.melee.primaryAttack = true;
        if (changed.attackTarget) {
          draft.modifiers.effects = this.getModifierEffects(
            draft.skillState.skill,
            draft.action,
          );
          if (draft.melee.attackTarget) {
            for (const [effect, active] of this.getAttackTargetEffects(
              draft.melee.attackTarget as Token,
              draft.skillState.skill,
              draft.action,
            ) || []) {
              draft.modifiers.effects.set(effect, active);
            }
          }
        }
      }),
    };

    if (this.melee.attackTarget) {
        for (const [effect, active] of this.getAttackTargetEffects(
          this.melee.attackTarget as Token,
          this.skillState.skill,
          this.action,
        ) || []) {
          this.modifiers.effects.set(effect, active);
        }
    }
  }

  protected getAttackTargetEffects(
    target: Token,
    skill: Skill,
    action: Action,
  ) {
    if (target.actor?.proxy.type !== ActorType.Character) return null;
    return new Map(
      target.actor.proxy.appliedEffects
        .getMatchingSuccessTestEffects(matchesSkill(skill)(action), true)
        .map((effect) => [{...effect, [Source]: `{${target.name}} ${effect[Source]}`}, !effect.requirement]),
    );
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
            length: grantedSuperiorResultEffects(
              last(testMessageData.states)?.result,
            ),
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
