import { createMessage } from '@src/chat/create-message';
import { SuperiorResultEffect } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor/actor';
import { ActorType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import {
  AggressiveOption,
  formulasFromMeleeSettings,
  MeleeWeaponSettings,
} from '@src/entities/weapon-settings';
import {
  Action,
  ActionSubtype,
  ActionType,
  createAction,
} from '@src/features/actions';
import { matchesSkill, Source } from '@src/features/effects';
import { Size, sizeReachAdvantage } from '@src/features/size';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import type { LabeledFormula } from '@src/foundry/rolls';
import { arrayOf, nonNegative } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import type { WritableDraft } from 'immer/dist/types/types-external';
import { compact, concat, last, merge, pick, pipe, set } from 'remeda';
import type { SetRequired } from 'type-fest';
import type { Character } from '../entities/actor/proxies/character';
import { SkillTest, SkillTestInit } from './skill-test';
import {
  createSuccessTestModifier,
  grantedSuperiorResultEffects,
  successTestEffectMap,
} from './success-test';

export type MeleeAttackTestInit = SetRequired<SkillTestInit, 'character'> & {
  meleeWeapon?: MeleeWeapon;
  primaryAttack?: boolean;
};

export class MeleeAttackTest extends SkillTest {
  readonly melee: WithUpdate<
    MeleeWeaponSettings & {
      weapon?: MeleeWeapon | null;
      primaryAttack: boolean;
      attackTarget?: Token | null;
    }
  >;

  readonly character;

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

  readonly reachModifier = createSuccessTestModifier({
    name: localize('reach'),
    value: 0,
  });

  readonly damageModifierEffects: LabeledFormula[];

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

    this.fullMoveModifier.name = `${localize('fullMove')} (${localize(
      'charging',
    )})`;
    this.fullMoveModifier.value = -10;
    const { sleeve } = this.character;
    this.melee = {
      weapon: meleeWeapon,
      primaryAttack: primaryAttack ?? true,
      unarmedDV:
        sleeve && sleeve.type !== ActorType.Infomorph ? sleeve.unarmedDV : '0',
      touchOnly: meleeWeapon?.isTouchOnly,
      attackTarget: [...game.user.targets][0], // TODO get closest to token
      damageIrrespectiveOfSize: meleeWeapon?.damageIrrespectiveOfSize,
      alwaysArmorPiercing: this.character.meleeDamageArmorPiercing,
      update: this.recipe((draft, changed) => {
        draft.melee = merge(draft.melee, changed);
        if (changed.weapon) {
          draft.melee.primaryAttack = true;
          draft.melee.touchOnly = draft.melee.weapon?.isTouchOnly;
          draft.melee.oneHanded = false;
          draft.melee.damageIrrespectiveOfSize =
            draft.melee.weapon?.damageIrrespectiveOfSize;
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
          draft.melee.weapon?.isTwoHanded &&
          draft.melee.oneHanded &&
          !this.largeMorph
        ) {
          simple.set(this.twoHandedModifier.id, this.twoHandedModifier);
        } else simple.delete(this.twoHandedModifier.id);

        draft.reachModifier.value = nonNegative(
          (draft.melee.weapon?.reachBonus || 0) +
            this.computeReachAdvantage(draft.melee.attackTarget?.actor),
        );

        if (draft.reachModifier.value) {
          simple.set(draft.reachModifier.id, draft.reachModifier);
        } else simple.delete(draft.reachModifier.id);
      }),
    };

    if (this.melee.attackTarget) {
      for (const [effect, active] of this.getAttackTargetEffects(
        this.melee.attackTarget,
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

    this.reachModifier.value = nonNegative(
      (this.melee.weapon?.reachBonus || 0) +
        this.computeReachAdvantage(this.melee.attackTarget?.actor),
    );

    if (this.reachModifier.value) {
      this.modifiers.simple.set(this.reachModifier.id, this.reachModifier);
    }

    this.damageModifierEffects =
      this.character.appliedEffects.meleeDamageBonuses;
  }

  private computeReachAdvantage(
    actor: (ActorEP | WritableDraft<ActorEP>) | null | undefined,
  ) {
    if (actor) {
      const { proxy } = actor;
      const targetSleeveSize =
        proxy.type === ActorType.Character
          ? proxy.morphSize
          : 'size' in proxy && proxy.size;
      const { morphSize } = this.character;
      if (targetSleeveSize && morphSize) {
        return (
          sizeReachAdvantage(morphSize, targetSleeveSize) +
          this.character.morphReach -
          (proxy.type === ActorType.Character ? proxy.morphReach : 0)
        );
      }
    }
    return this.character.morphReach;
  }

  get largeMorph() {
    const { morphSize } = this.character;
    return morphSize === Size.Large || morphSize === Size.VeryLarge;
  }

  get attack() {
    const { weapon, primaryAttack } = this.melee;
    if (!weapon) return null;
    return primaryAttack
      ? weapon.attacks.primary
      : weapon.attacks.secondary || weapon.attacks.primary;
  }

  get damageFormulas() {
    return pipe(
      [
        (!this.melee.weapon || this.melee.weapon?.augmentUnarmed) && {
          label: localize('unarmedDV'),
          formula: this.melee.unarmedDV || '0',
        },
        ...formulasFromMeleeSettings(
          set(this.melee, 'charging', this.action.fullMove),
        ),
        ...this.damageModifierEffects,
      ],
      compact,
      concat(this.attack?.rollFormulas || []),
    );
  }

  protected getAttackTargetEffects(
    target: Token,
    skill: Skill,
    action: Action,
  ) {
    if (target.actor?.proxy.type !== ActorType.Character) return null;
    return successTestEffectMap(
      (target.actor.proxy as Character).appliedEffects
        .getMatchingSuccessTestEffects(matchesSkill(skill)(action), true)
        .map((effect) => ({
          ...effect,
          [Source]: `{${target.name}} ${effect[Source]}`,
        })),
    );
  }

  protected async createMessage() {
    const {
      settings,
      pools,
      action,
      melee,
      testMessageData,
      damageModifierEffects,
    } = this;

    const { weapon, primaryAttack, charging, attackTarget, ...meleeSettings } =
      melee;

    const message = await createMessage({
      data: {
        header: {
          heading: `${weapon?.name || localize('unarmed')} ${localize(
            'meleeAttack',
          )}`,
          subheadings: [
            this.name,
            [
              `${action.type} ${
                action.timeMod && action.type !== ActionType.Task
                  ? `(${localize('as')} ${localize('task')})`
                  : ''
              }`,
              localize(action.subtype),
              localize('action'),
            ].join(' '),
          ],
          img: weapon?.nonDefaultImg,
          description: weapon?.description,
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
        targets: compact([
          attackTarget?.scene && {
            tokenId: attackTarget.id,
            sceneId: attackTarget.scene.id,
          },
        ]),
        meleeAttack: {
          weapon: weapon?.getDataCopy(),
          attackType: primaryAttack ? 'primary' : 'secondary',
          charging: action.fullMove,
          ...pick(meleeSettings, [
            'aggressive',
            'extraWeapons',
            'touchOnly',
            'unarmedDV',
            'oneHanded',
            'calledShot',
            'damageIrrespectiveOfSize',
            'alwaysArmorPiercing',
          ]),
          morphSize: this.character.morphSize,
          damageModifiers: damageModifierEffects,
        },
      },

      entity: this.token ?? this.character, // TODO account for item sources,
      visibility: settings.visibility,
    });

    if (pools.active) {
      await this.character?.addToSpentPools({
        pool: pools.active[0].type,
        points: 1,
      });
    }

    return message.id;
  }
}
