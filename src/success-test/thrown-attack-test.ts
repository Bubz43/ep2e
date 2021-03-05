import { CalledShot, RangeRating } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import type { ThrownWeapon } from '@src/entities/item/proxies/thrown-weapon';
import {
  Action,
  ActionSubtype,
  ActionType,
  createAction,
} from '@src/features/actions';
import { matchesSkill, Source } from '@src/features/effects';
import { getCurrentEnvironment } from '@src/features/environment';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { distanceBetweenTokens } from '@src/foundry/token-helpers';
import type { WithUpdate } from '@src/utility/updating';
import { merge } from 'remeda';
import type { SetRequired } from 'type-fest';
import { getRangeModifier } from './range-modifiers';
import { SkillTest, SkillTestInit } from './skill-test';
import {
  createSuccessTestModifier,
  successTestEffectMap,
} from './success-test';

export type ThrownAttackTestInit = SetRequired<SkillTestInit, 'character'> & {
  weapon: ThrownWeapon | Explosive;
  primaryAttack: boolean;
};

export class ThrownAttackTest extends SkillTest {
  readonly character;

  // readonly explosiveSettings?: WithUpdate<ExplosiveSettings>;

  readonly throwing: WithUpdate<{
    weapon: ThrownAttackTestInit['weapon'];
    primaryAttack: boolean;
    attackTarget?: Token | null;
    targetDistance: number;
    range: number;
    calledShot?: CalledShot | null;
  }>;

  readonly calledShotModifier = createSuccessTestModifier({
    name: localize('calledShot'),
    value: -10,
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
      range: !gravity ? Infinity : this.character.ego.aptitudes.som / gravity,
      targetDistance:
        attackTarget && this.token
          ? distanceBetweenTokens(this.token, attackTarget)
          : 10,
      primaryAttack,
      weapon,
      update: this.recipe((draft, changed) => {
        draft.throwing = merge(draft.throwing, changed);
        if (changed.weapon) {
          draft.throwing.primaryAttack = true;
          draft.throwing.calledShot = null;
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

        const { simple } = draft.modifiers;

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

  get attack() {
    const { weapon, primaryAttack } = this.throwing;
    return primaryAttack
      ? weapon.attacks.primary
      : weapon.attacks.secondary || weapon.attacks.primary;
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
}
