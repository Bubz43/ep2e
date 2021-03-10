import { createMessage } from '@src/chat/create-message';
import {
  CalledShot,
  ExplosiveTrigger,
  RangeRating,
  SuperiorResultEffect,
} from '@src/data-enums';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { RangedWeapon } from '@src/entities/item/item';
import {
  createExplosiveTriggerSetting,
  ExplosiveSettings,
} from '@src/entities/weapon-settings';
import {
  Action,
  ActionSubtype,
  ActionType,
  createAction,
} from '@src/features/actions';
import { matchesSkill, Source } from '@src/features/effects';
import { getCurrentEnvironment } from '@src/features/environment';
import { FiringMode, firingModeCost } from '@src/features/firing-modes';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import type { LabeledFormula } from '@src/foundry/rolls';
import { distanceBetweenTokens } from '@src/foundry/token-helpers';
import { arrayOf, notEmpty } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { compact, last, merge } from 'remeda';
import type { SetRequired } from 'type-fest';
import { getRangeModifier, getWeaponRange } from './range-modifiers';
import { SkillTest, SkillTestInit } from './skill-test';
import {
  createSuccessTestModifier,
  grantedSuperiorResultEffects,
  successTestEffectMap,
} from './success-test';

export type RangedAttackTestInit = SetRequired<SkillTestInit, 'character'> & {
  weapon: RangedWeapon;
  primaryAttack: boolean;
  firingMode: FiringMode;
};

export class RangedAttackTest extends SkillTest {
  readonly character;

  readonly firing: WithUpdate<{
    weapon: RangedAttackTestInit['weapon'];
    primaryAttack: boolean;
    attackTarget?: Token | null;
    targetDistance: number;
    range: number;
    calledShot?: CalledShot | null;
    firingMode: FiringMode;
    suppressiveFire?: boolean;
    explosiveSettings?: ExplosiveSettings | null;
    oneHanded?: boolean;
  }>;

  readonly calledShotModifier = createSuccessTestModifier({
    name: localize('calledShot'),
    value: -10,
  });

  readonly twoHandedModifier = createSuccessTestModifier({
    name: capitalize(
      `${localize('wieldedWith')} ${localize('oneHand')}`.toLocaleLowerCase(),
    ),
    value: -20,
  });

  readonly rangeModifier = createSuccessTestModifier({
    name: RangeRating.Range,
    value: 0,
  });
  largeMorph: any;

  constructor({
    weapon,
    primaryAttack,
    firingMode,
    ...init
  }: RangedAttackTestInit) {
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

    const { gravity } = getCurrentEnvironment();

    const attackTarget = [...game.user.targets][0];

    this.firing = {
      attackTarget,
      range: getWeaponRange(weapon),
      targetDistance:
        attackTarget && this.token
          ? Math.ceil(distanceBetweenTokens(this.token, attackTarget))
          : 10,
      primaryAttack,
      weapon,
      firingMode: firingMode,
      explosiveSettings:
        weapon.type === ItemType.SeekerWeapon
          ? {
              trigger: createExplosiveTriggerSetting(ExplosiveTrigger.Impact),
            }
          : null,
      update: this.recipe((draft, changed) => {
        draft.firing = merge(draft.firing, changed);
        if (changed.weapon) {
          draft.firing.primaryAttack = true;
          draft.firing.calledShot = null;
          draft.firing.oneHanded = false;
          draft.firing.suppressiveFire = false;
          draft.firing.range = getWeaponRange(
            draft.firing.weapon as RangedWeapon,
          );
          draft.firing.firingMode =
            draft.firing.weapon.type === ItemType.SeekerWeapon
              ? draft.firing.weapon.firingMode
              : draft.firing.weapon.attacks.primary.firingModes[0]!;
          draft.firing.explosiveSettings =
            draft.firing.weapon.type === ItemType.SeekerWeapon
              ? {
                  trigger: createExplosiveTriggerSetting(
                    ExplosiveTrigger.Impact,
                  ),
                }
              : null;
        }

        if (changed.attackTarget) {
          draft.modifiers.effects = this.getModifierEffects(
            draft.skillState.skill,
            draft.action,
          );
          if (draft.firing.attackTarget) {
            for (const [effect, active] of this.getAttackTargetEffects(
              draft.firing.attackTarget as Token,
              draft.skillState.skill,
              draft.action,
            ) || []) {
              draft.modifiers.effects.set(effect, active);
            }
          }
        }

        if (changed.attackTarget !== undefined) {
          draft.firing.targetDistance =
            draft.firing.attackTarget && this.token
              ? Math.ceil(
                  distanceBetweenTokens(
                    this.token,
                    draft.firing.attackTarget as Token,
                  ),
                )
              : 10;
        }

        const { simple } = draft.modifiers;

        if (
          draft.firing.weapon?.isTwoHanded &&
          draft.firing.oneHanded &&
          !this.largeMorph
        ) {
          simple.set(this.twoHandedModifier.id, this.twoHandedModifier);
        } else simple.delete(this.twoHandedModifier.id);

        if (draft.firing.calledShot) {
          simple.set(this.calledShotModifier.id, this.calledShotModifier);
        } else simple.delete(this.calledShotModifier.id);

        const { rating, modifier } = getRangeModifier(
          draft.firing.range,
          draft.firing.targetDistance,
        );
        draft.rangeModifier.name = localize(rating);
        draft.rangeModifier.value = modifier;
        simple.set(draft.rangeModifier.id, draft.rangeModifier);
      }),
    };

    if (this.firing.attackTarget) {
      for (const [effect, active] of this.getAttackTargetEffects(
        this.firing.attackTarget,
        this.skillState.skill,
        this.action,
      ) || []) {
        this.modifiers.effects.set(effect, active);
      }
    }

    const { rating, modifier } = getRangeModifier(
      this.firing.range,
      this.firing.targetDistance,
    );
    this.rangeModifier.name = localize(rating);
    this.rangeModifier.value = modifier;
    this.modifiers.simple.set(this.rangeModifier.id, this.rangeModifier);
  }

  protected getAttackTargetEffects(
    target: Token,
    skill: Skill,
    action: Action,
  ) {
    if (target.actor?.proxy.type !== ActorType.Character) return null;
    return successTestEffectMap(
      target.actor.proxy.appliedEffects
        .getMatchingSuccessTestEffects(matchesSkill(skill)(action), true)
        .map((effect) => ({
          ...effect,
          [Source]: `{${target.name}} ${effect[Source]}`,
        })),
    );
  }

  get canCallShot() {
    const { weapon } = this.firing;
    return weapon.type === ItemType.SeekerWeapon
      ? !weapon.missiles?.areaEffect
      : weapon.type !== ItemType.SprayWeapon;
  }

  get attack() {
    const { weapon, primaryAttack } = this.firing;
    return primaryAttack
      ? weapon.attacks?.primary
      : weapon.attacks?.secondary || weapon.attacks?.primary;
  }

  get rangeDamageModifier(): LabeledFormula | null {
    return null;
    // return this.firing.weapon.type === ItemType.ThrownWeapon &&
    //   this.rangeModifier.value < -10 &&
    //   !getCurrentEnvironment().vacuum
    //   ? {
    //       label: localize('beyondRange'),
    //       formula: '-1d10',
    //     }
    //   : null;
  }

  protected async createMessage() {
    const {
      settings,
      pools,
      action,
      firing,
      attack,
      testMessageData,
      rangeDamageModifier,
    } = this;

    const {
      weapon,
      primaryAttack,
      attackTarget,
      explosiveSettings,
      calledShot,
      firingMode,
      suppressiveFire,
    } = firing;

    await createMessage({
      data: {
        header: {
          heading: `${weapon.name} ${localize('rangedAttack')}`,
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
          defaultSuperiorEffect:
            weapon.type !== ItemType.SeekerWeapon &&
            notEmpty(attack?.rollFormulas)
              ? SuperiorResultEffect.Damage
              : undefined,
        },
        explosiveUse:
          weapon.type === ItemType.SeekerWeapon &&
          weapon.missiles &&
          explosiveSettings
            ? {
                ...explosiveSettings,
                attackType: primaryAttack ? 'primary' : 'secondary',
                explosive: weapon.missiles.getDataCopy(),
              }
            : undefined,

        targets: compact([
          attackTarget?.scene && {
            tokenId: attackTarget.id,
            sceneId: attackTarget.scene.id,
          },
        ]),
      },

      entity: this.token ?? this.character, // TODO account for item sources,
      visibility: settings.visibility,
    });

    if (pools.active) {
      await this.character?.modifySpentPools({
        pool: pools.active[0].type,
        points: 1,
      });
    }
    await weapon.fire(
      suppressiveFire
        ? firingModeCost.suppressiveFire
        : firingModeCost[firingMode],
    );
  }
}
