import { createMessage } from '@src/chat/create-message';
import { SuperiorResultEffect } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import {
  AggressiveOption,
  MeleeWeaponSettings,
} from '@src/entities/weapon-settings';
import {
  Action,
  ActionSubtype,
  ActionType,
  createAction,
} from '@src/features/actions';
import { EffectType, matchesSkill, Source } from '@src/features/effects';
import { Size } from '@src/features/size';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { arrayOf } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { compact, concat, last, merge, pick, pipe } from 'remeda';
import type { SetRequired } from 'type-fest';
import { SkillTest, SkillTestInit } from './skill-test';
import {
  createSuccessTestModifier,
  grantedSuperiorResultEffects,
} from './success-test';

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

  readonly aggressiveModifier = createSuccessTestModifier({
    name: localize('aggressive'),
    value: 10,
  });

  readonly calledShotModifier = createSuccessTestModifier({
    name: localize('calledShot'),
    value: -10,
  });

  readonly touchOnlyModifier = createSuccessTestModifier({
    name: localize('touchOnly'),
    value: 20,
  });

  readonly twoHandedModifier = createSuccessTestModifier({
    name: capitalize(
      `${localize('wieldedWith')} ${localize('oneHand')}`.toLocaleLowerCase(),
    ),
    value: -20,
  });

  constructor({ meleeWeapon, primaryAttack, ...init }: MeleeAttackTestInit) {
    super({
      ...init,
      action:
        init.action ??
        createAction({
          type: ActionType.Complex,
          subtype: ActionSubtype.Physical,
        }),
    });
    this.character = init.character;
    this.melee = {
      weapon: meleeWeapon,
      primaryAttack,
      touchOnly: meleeWeapon.isTouchOnly,
      attackTarget: [...game.user.targets][0], // TODO get closest to token
      update: this.recipe((draft, changed) => {
        draft.melee = merge(draft.melee, changed);
        if (changed.weapon) {
          draft.melee.primaryAttack = true;
          draft.melee.touchOnly = draft.melee.weapon.isTouchOnly;
          draft.melee.oneHanded = false;
        }
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

        const { simple } = draft.modifiers;

        if (draft.melee.aggressive === AggressiveOption.Modifier) {
          simple.set(this.aggressiveModifier.id, this.aggressiveModifier);
        } else simple.delete(this.aggressiveModifier.id);

        if (draft.melee.touchOnly) {
          simple.set(this.touchOnlyModifier.id, this.touchOnlyModifier);
        } else simple.delete(this.touchOnlyModifier.id);

        if (draft.melee.calledShot) {
          simple.set(this.calledShotModifier.id, this.calledShotModifier);
        } else simple.delete(this.calledShotModifier.id);

        if (
          draft.melee.weapon.isTwoHanded &&
          draft.melee.oneHanded &&
          !this.largeMorph
        ) {
          simple.set(this.twoHandedModifier.id, this.twoHandedModifier);
        } else simple.delete(this.twoHandedModifier.id);
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
    if (this.melee.touchOnly) {
      this.modifiers.simple.set(
        this.touchOnlyModifier.id,
        this.touchOnlyModifier,
      );
    }
  }

  get largeMorph() {
    const { sleeve } = this.character;
    if (!sleeve || sleeve.type === ActorType.Infomorph) return false;
    return sleeve.size === Size.Large || sleeve.size === Size.VeryLarge;
  }

  get attack() {
    const { weapon, primaryAttack } = this.melee;
    return primaryAttack
      ? weapon.attacks.primary
      : weapon.attacks.secondary || weapon.attacks.primary;
  }

  get damageFormulas() {
    const { attack, character } = this;
    const { augmentUnarmed } = this.melee.weapon;
    const { unarmedDV, aggressive, charging, extraWeapon } = this.melee;
    return pipe(
      [
        augmentUnarmed && {
          label: localize('unarmedDV'),
          formula: unarmedDV || '0',
        },
        aggressive === AggressiveOption.Damage && {
          label: localize('aggressive'),
          formula: '+1d10',
        },
        charging && { label: localize('charging'), formula: '+1d6' },
        extraWeapon && {
          label: localize('extraWeapon'),
          formula: '+1d6',
        },
        ...character.appliedEffects
          .getGroup(EffectType.Melee)
          .map((effect) => ({
            label: effect[Source],
            formula: effect.dvModifier,
          })),
      ],
      compact,
      concat(attack.rollFormulas),
    );
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
        .map((effect) => [
          { ...effect, [Source]: `{${target.name}} ${effect[Source]}` },
          !effect.requirement,
        ]),
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
