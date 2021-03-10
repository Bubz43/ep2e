import { createMessage } from '@src/chat/create-message';
import {
  CalledShot,
  ExplosiveTrigger,
  RangeRating,
  SuperiorResultEffect,
} from '@src/data-enums';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import type { ThrownWeapon } from '@src/entities/item/proxies/thrown-weapon';
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
import { Size } from '@src/features/size';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import type { LabeledFormula } from '@src/foundry/rolls';
import { distanceBetweenTokens } from '@src/foundry/token-helpers';
import { arrayOf } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { compact, concat, last, merge, pipe } from 'remeda';
import type { SetRequired } from 'type-fest';
import { getRangeModifier } from './range-modifiers';
import { SkillTest, SkillTestInit } from './skill-test';
import {
  createSuccessTestModifier,
  grantedSuperiorResultEffects,
  successTestEffectMap,
} from './success-test';

export type ThrownAttackTestInit = SetRequired<SkillTestInit, 'character'> & {
  weapon: ThrownWeapon | Explosive;
  primaryAttack: boolean;
};

export class ThrownAttackTest extends SkillTest {
  readonly character;

  readonly throwing: WithUpdate<{
    weapon: ThrownAttackTestInit['weapon'];
    primaryAttack: boolean;
    attackTarget?: Token | null;
    targetDistance: number;
    range: number;
    calledShot?: CalledShot | null;
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

  constructor({ weapon, primaryAttack, ...init }: ThrownAttackTestInit) {
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

    this.throwing = {
      attackTarget,
      range: !gravity
        ? Infinity
        : Math.round(this.character.ego.aptitudes.som / gravity),
      targetDistance:
        attackTarget && this.token
          ? Math.ceil(distanceBetweenTokens(this.token, attackTarget))
          : 10,
      primaryAttack,
      weapon,
      explosiveSettings:
        weapon.type === ItemType.Explosive
          ? {
              trigger: createExplosiveTriggerSetting(ExplosiveTrigger.Impact),
            }
          : null,
      update: this.recipe((draft, changed) => {
        draft.throwing = merge(draft.throwing, changed);
        if (changed.weapon) {
          draft.throwing.primaryAttack = true;
          draft.throwing.calledShot = null;
          draft.throwing.oneHanded = false;
          draft.throwing.explosiveSettings =
            draft.throwing.weapon.type === ItemType.Explosive
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
          if (draft.throwing.attackTarget) {
            for (const [effect, active] of this.getAttackTargetEffects(
              draft.throwing.attackTarget as Token,
              draft.skillState.skill,
              draft.action,
            ) || []) {
              draft.modifiers.effects.set(effect, active);
            }
          }
        }

        if (changed.attackTarget !== undefined) {
          draft.throwing.targetDistance =
            draft.throwing.attackTarget && this.token
              ? Math.ceil(
                  distanceBetweenTokens(
                    this.token,
                    draft.throwing.attackTarget as Token,
                  ),
                )
              : 10;
        }

        const { simple } = draft.modifiers;

        if (
          draft.throwing.weapon.type === ItemType.ThrownWeapon &&
          draft.throwing.weapon?.isTwoHanded &&
          draft.throwing.oneHanded &&
          !this.largeMorph
        ) {
          simple.set(this.twoHandedModifier.id, this.twoHandedModifier);
        } else simple.delete(this.twoHandedModifier.id);

        if (draft.throwing.calledShot) {
          simple.set(this.calledShotModifier.id, this.calledShotModifier);
        } else simple.delete(this.calledShotModifier.id);

        const { rating, modifier } = getRangeModifier(
          draft.throwing.range,
          draft.throwing.targetDistance,
        );
        draft.rangeModifier.name = localize(rating);
        draft.rangeModifier.value = modifier;
        simple.set(draft.rangeModifier.id, draft.rangeModifier);
      }),
    };

    if (this.throwing.attackTarget) {
      for (const [effect, active] of this.getAttackTargetEffects(
        this.throwing.attackTarget,
        this.skillState.skill,
        this.action,
      ) || []) {
        this.modifiers.effects.set(effect, active);
      }
    }

    const { rating, modifier } = getRangeModifier(
      this.throwing.range,
      this.throwing.targetDistance,
    );
    this.rangeModifier.name = localize(rating);
    this.rangeModifier.value = modifier;
    this.modifiers.simple.set(this.rangeModifier.id, this.rangeModifier);
  }

  get largeMorph() {
    const { morphSize } = this.character;
    return morphSize === Size.Large || morphSize === Size.VeryLarge;
  }

  get attack() {
    const { weapon, primaryAttack } = this.throwing;
    return primaryAttack
      ? weapon.attacks.primary
      : weapon.attacks.secondary || weapon.attacks.primary;
  }

  get rangeDamageModifier(): LabeledFormula | null {
    return this.throwing.weapon.type === ItemType.ThrownWeapon &&
      this.rangeModifier.value < -10 &&
      !getCurrentEnvironment().vacuum
      ? {
          label: localize('beyondRange'),
          formula: '-1d10',
        }
      : null;
  }

  get damageFormulas() {
    return pipe(
      [this.rangeDamageModifier],
      compact,
      concat(this.attack.rollFormulas || []),
    );
  }

  get canCallShot() {
    const { weapon } = this.throwing;
    return weapon.type === ItemType.ThrownWeapon || !weapon.areaEffect;
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

  protected async createMessage() {
    const {
      settings,
      pools,
      action,
      throwing,
      testMessageData,
      rangeDamageModifier,
    } = this;

    const {
      weapon,
      primaryAttack,
      attackTarget,
      explosiveSettings,
      calledShot,
    } = throwing;

    await createMessage({
      data: {
        header: {
          heading: `${weapon.name} ${localize('thrownAttack')}`,
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
            weapon.type === ItemType.ThrownWeapon
              ? SuperiorResultEffect.Damage
              : undefined,
        },
        explosiveUse:
          weapon.type === ItemType.Explosive && explosiveSettings
            ? {
                ...explosiveSettings,
                attackType: primaryAttack ? 'primary' : 'secondary',
                explosive: weapon.getDataCopy(),
              }
            : undefined,
        thrownAttack:
          weapon.type === ItemType.ThrownWeapon
            ? {
                weapon: weapon.getDataCopy(),
                calledShot,
                damageModifiers: rangeDamageModifier
                  ? [rangeDamageModifier]
                  : undefined,
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
    await weapon.consumeUnit();
  }
}
