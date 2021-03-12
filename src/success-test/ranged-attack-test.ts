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
import {
  createFiringModeGroup,
  FiringModeGroup,
  getFiringModeGroupShots,
  MultiAmmoOption,
  multiAmmoValues,
} from '@src/features/firing-modes';
import { Size } from '@src/features/size';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import type { LabeledFormula } from '@src/foundry/rolls';
import { distanceBetweenTokens } from '@src/foundry/token-helpers';
import { arrayOf, notEmpty } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { compact, last, merge, take } from 'remeda';
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
  firingModeGroup: FiringModeGroup;
};

export class RangedAttackTest extends SkillTest {
  readonly character;

  readonly firing: WithUpdate<{
    weapon: RangedAttackTestInit['weapon'];
    primaryAttack: boolean;
    attackTargets: Set<Token>;
    maxTargets: number;
    targetDistance: number;
    range: number;
    calledShot?: CalledShot | null;
    firingModeGroup: FiringModeGroup;
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

  // TODO Long modifier in melee

  readonly carryingFixedModifier = createSuccessTestModifier({
    name: `${localize('carrying')} ${localize('fixed')}`,
    value: -20,
  });

  readonly rangeModifier = createSuccessTestModifier({
    name: RangeRating.Range,
    value: 0,
  });

  readonly toHitModifier = createSuccessTestModifier({
    name: `${localize('concentratedToHit')}`,
    value: 10,
  });

  rangeRating: RangeRating;

  constructor({
    weapon,
    primaryAttack,
    firingModeGroup,
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

    const maxTargets =
      firingModeGroup[1] === MultiAmmoOption.AdjacentTargets
        ? multiAmmoValues[firingModeGroup[0]].adjacentTargets
        : 1;

    const attackTargets = new Set(take([...game.user.targets], maxTargets));
    const { token } = this;
    this.firing = {
      attackTargets: attackTargets,
      range: getWeaponRange(weapon),
      targetDistance:
        token && notEmpty(attackTargets)
          ? Math.max(
              ...[...attackTargets].map((target) =>
                Math.ceil(distanceBetweenTokens(token, target)),
              ),
            )
          : 10,

      primaryAttack,
      weapon,
      firingModeGroup: firingModeGroup,
      maxTargets,
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
          draft.firing.range = getWeaponRange(
            draft.firing.weapon as RangedWeapon,
          );
          draft.firing.firingModeGroup = createFiringModeGroup(
            draft.firing.weapon.type === ItemType.SeekerWeapon
              ? draft.firing.weapon.firingMode
              : draft.firing.weapon.attacks.primary.firingModes[0]!,
          );
          draft.firing.explosiveSettings =
            draft.firing.weapon.type === ItemType.SeekerWeapon
              ? {
                  trigger: createExplosiveTriggerSetting(
                    ExplosiveTrigger.Impact,
                  ),
                }
              : null;
        } else if (changed.primaryAttack) {
          draft.firing.firingModeGroup = createFiringModeGroup(
            draft.firing.weapon.type === ItemType.SeekerWeapon
              ? draft.firing.weapon.firingMode
              : draft.firing.weapon.attacks.primary.firingModes[0]!,
          );
        }

        if (
          draft.firing.firingModeGroup[1] === MultiAmmoOption.AdjacentTargets
        ) {
          draft.firing.maxTargets =
            multiAmmoValues[draft.firing.firingModeGroup[0]].adjacentTargets;
        } else draft.firing.maxTargets = 1;

        draft.firing.attackTargets = new Set(
          take([...draft.firing.attackTargets], draft.firing.maxTargets),
        );

        draft.modifiers.effects = this.getModifierEffects(
          draft.skillState.skill,
          draft.action,
        );
        for (const attackTarget of draft.firing.attackTargets) {
          for (const [effect, active] of this.getAttackTargetEffects(
            attackTarget as Token,
            draft.skillState.skill,
            draft.action,
          ) || []) {
            draft.modifiers.effects.set(effect, active);
          }
        }
        draft.firing.targetDistance =
          token && notEmpty(draft.firing.attackTargets)
            ? Math.max(
                ...[...draft.firing.attackTargets].map((target) =>
                  Math.ceil(distanceBetweenTokens(token, target as Token)),
                ),
              )
            : 10;

        const { simple } = draft.modifiers;
        if (
          draft.firing.firingModeGroup[1] === MultiAmmoOption.ConcentratedToHit
        ) {
          draft.toHitModifier.value =
            multiAmmoValues[draft.firing.firingModeGroup[0]].concentratedToHit;
          simple.set(draft.toHitModifier.id, draft.toHitModifier);
        } else simple.delete(draft.toHitModifier.id);

        if (
          draft.firing.weapon.isTwoHanded &&
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
        draft.rangeRating = rating;
        draft.rangeModifier.name = localize(rating);
        draft.rangeModifier.value = modifier;
        simple.set(draft.rangeModifier.id, draft.rangeModifier);
      }),
    };

    for (const attackTarget of this.firing.attackTargets) {
      for (const [effect, active] of this.getAttackTargetEffects(
        attackTarget,
        this.skillState.skill,
        this.action,
      ) || []) {
        this.modifiers.effects.set(effect, active);
      }
    }

    if (this.firing.firingModeGroup[1] === MultiAmmoOption.ConcentratedToHit) {
      this.toHitModifier.value =
        multiAmmoValues[this.firing.firingModeGroup[0]].concentratedToHit;
      this.modifiers.simple.set(this.toHitModifier.id, this.toHitModifier);
    }

    if (weapon.isFixed && !weapon.braced) {
      this.modifiers.simple.set(
        this.carryingFixedModifier.id,
        this.carryingFixedModifier,
      );
    }

    const { rating, modifier } = getRangeModifier(
      this.firing.range,
      this.firing.targetDistance,
    );
    this.rangeRating = rating;
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

  get largeMorph() {
    const { morphSize } = this.character;
    return morphSize === Size.Large || morphSize === Size.VeryLarge;
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
    const { weapon } = this.firing;
    if (weapon.type === ItemType.SprayWeapon) {
      switch (this.rangeRating) {
        case RangeRating.PointBlank:
        case RangeRating.Close:
          return {
            label: localize(this.rangeRating),
            formula: '+1d10',
          };
        case RangeRating.Range:
          return null;
        case RangeRating.BeyondRange:
          return getCurrentEnvironment().vacuum
            ? null
            : {
                label: localize(this.rangeRating),
                formula: '-1d10',
              };
      }
    }

    if (
      (weapon.type === ItemType.Railgun || weapon.type === ItemType.Firearm) &&
      this.rangeRating === RangeRating.BeyondRange &&
      !getCurrentEnvironment().vacuum
    ) {
      return {
        label: localize(this.rangeRating),
        formula: '-1d10',
      };
    }
    return null;
  }

  get damageModifiers(): LabeledFormula[] {
    const formulas: LabeledFormula[] = [];
    if (this.attack?.rollFormulas.length === 0) return formulas;
    const { rangeDamageModifier } = this;
    if (rangeDamageModifier) formulas.push(rangeDamageModifier);
    const { firingModeGroup } = this.firing;
    console.log(firingModeGroup);
    if (firingModeGroup[1] === MultiAmmoOption.ConcentratedDamage) {
      formulas.push({
        label: `${localize(firingModeGroup[0])} ${localize(
          'concentratedDamage',
        )}`,
        formula: multiAmmoValues[firingModeGroup[0]][firingModeGroup[1]],
      });
    }
    console.log(formulas);

    return formulas;
  }

  protected async createMessage() {
    const {
      settings,
      pools,
      action,
      firing,
      attack,
      testMessageData,
      damageModifiers,
    } = this;

    const {
      weapon,
      primaryAttack,
      attackTargets,
      explosiveSettings,
      calledShot,
      firingModeGroup,
    } = firing;

    await createMessage({
      data: {
        header: {
          heading: `${weapon.fullName} ${localize('rangedAttack')}`,
          subheadings: compact([
            weapon.fullType,
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
          ]),
          img: weapon.nonDefaultImg,
          description: weapon.description,
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
        rangedAttack: {
          weapon: weapon.getDataCopy(),
          calledShot,
          firingModeGroup,
          damageModifiers,
          primaryAttack,
        },
        explosiveUse:
          weapon.type === ItemType.SeekerWeapon &&
          weapon.missiles &&
          explosiveSettings
            ? {
                ...explosiveSettings,
                attackType: primaryAttack ? 'primary' : 'secondary',
                explosive: weapon.missiles.getDataCopy(),
                showHeader: true,
              }
            : undefined,

        targets: compact(
          [...attackTargets].map(
            (attackTarget) =>
              attackTarget.scene && {
                tokenId: attackTarget.id,
                sceneId: attackTarget.scene.id,
              },
          ),
        ),
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
    await weapon.fire(getFiringModeGroupShots(firingModeGroup));
  }
}
