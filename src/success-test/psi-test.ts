import { createMessage } from '@src/chat/create-message';
import {
  PoolType,
  PsiPush,
  PsiRange,
  SleightDuration,
  SuperiorResultEffect,
} from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import {
  Action,
  ActionSubtype,
  ActionType,
  createAction,
} from '@src/features/actions';
import { matchesSkill, Source } from '@src/features/effects';
import { Pool } from '@src/features/pool';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { distanceBetweenTokens } from '@src/foundry/token-helpers';
import { notEmpty } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { clamp, compact, merge, take } from 'remeda';
import type { SetRequired } from 'type-fest';
import type { Character } from '../entities/actor/proxies/character';
import { psiRangeThresholds } from './range-modifiers';
import { SkillTest, SkillTestInit } from './skill-test';
import {
  createSuccessTestModifier,
  successTestEffectMap,
} from './success-test';

export type PsiTestInit = SetRequired<SkillTestInit, 'character'> & {
  sleight: Sleight;
};

export class PsiTest extends SkillTest {
  readonly character;

  readonly use: WithUpdate<{
    sleight: Sleight;
    push: '' | PsiPush;
    attackTargets: Set<Token>;
    targetDistance: number;
    targetingAsync: boolean;
    maxTargets: number;
    targetingSelf: boolean;
    range: PsiRange;
    touchingTarget: boolean;
    sideEffectNegation: number;
  }>;

  readonly rangeModifier = createSuccessTestModifier({
    name: `${localize('range')}: ${localize(PsiRange.Close)}`,
    value: 0,
  });

  constructor({ sleight, ...init }: PsiTestInit) {
    super({
      ...init,
      action:
        init.action ??
        createAction({
          type: sleight.action,
          subtype: ActionSubtype.Mental,
          timeframe:
            sleight.action === ActionType.Task ? sleight.epData.timeframe : 0,
        }),
    });
    this.character = init.character;
    const freePush = this.psi?.activeFreePush;
    const maxTargets = freePush === PsiPush.ExtraTarget ? 2 : 1;
    const attackTargets = new Set(take([...game.user.targets], maxTargets));
    const { token } = this;
    const targettingSelf = !!token && attackTargets.has(token.object);
    const targetDistance =
      token && notEmpty(attackTargets)
        ? Math.max(
            ...[...attackTargets].map((target) =>
              distanceBetweenTokens(token.object, target),
            ),
          )
        : 10;

    this.use = {
      sleight,
      push: '',
      maxTargets,
      attackTargets,
      targetingSelf: targettingSelf,
      targetDistance,
      touchingTarget: false,
      range: PsiRange.Close,
      targetingAsync: false,
      sideEffectNegation: 0,
      update: this.recipe((draft, changed) => {
        const currentPoolUse = draft.use.sideEffectNegation;
        draft.use = merge(draft.use, changed);
        const { use } = draft;
        if (changed.sleight) {
          this.updateAction(draft, { type: use.sleight.action });
          use.push = '';
        }

        if (use.targetingSelf) {
          use.touchingTarget = false;
        }

        if (!use.push)
          use.sideEffectNegation = clamp(use.sideEffectNegation, { max: 1 });

        if (use.sideEffectNegation !== currentPoolUse) {
          draft.pools.available = this.getPools(this.skillState.skill).map(
            (pool) =>
              pool.type === PoolType.Flex
                ? pool
                : new Pool({
                    type: pool.type,
                    spent: pool.spent + draft.use.sideEffectNegation,
                    initialValue: pool.max,
                  }),
          );
        }

        for (const attackTarget of draft.use.attackTargets) {
          for (const [effect, active] of this.getAttackTargetEffects(
            attackTarget as Token,
            draft.skillState.skill,
            draft.action,
          ) || []) {
            draft.modifiers.effects.set(effect, active);
          }
        }

        if (changed.attackTargets && notEmpty(use.attackTargets) && token) {
          use.targetDistance = Math.max(
            ...[...use.attackTargets].map((target) =>
              distanceBetweenTokens(token.object, target as Token),
            ),
          );
        }

        draft.modifiers.effects = this.getModifierEffects(
          draft.skillState.skill,
          draft.action,
        );

        use.maxTargets =
          maxTargets + (use.push === PsiPush.ExtraTarget ? 1 : 0);

        if (use.targetingSelf) {
          draft.modifiers.simple.delete(this.rangeModifier.id);
        } else if (use.touchingTarget) {
          draft.rangeModifier.name = `${localize('range')}: ${localize(
            PsiRange.Touch,
          )}`;
          draft.rangeModifier.value = 20;

          draft.modifiers.simple.set(
            draft.rangeModifier.id,
            draft.rangeModifier,
          );
        } else {
          const thresholds = psiRangeThresholds(
            (use.targetingAsync ? 1 : 0) +
              ((use.push || freePush) === PsiPush.IncreasedRange ? 1 : 0),
          );
          if (draft.use.targetDistance <= thresholds.pointBlank) {
            draft.rangeModifier.name = `${localize('range')}: ${localize(
              PsiRange.PointBlank,
            )}`;
            draft.rangeModifier.value = 10;
          } else if (use.targetDistance <= thresholds.close) {
            draft.rangeModifier.name = `${localize('range')}: ${localize(
              PsiRange.Close,
            )}`;
            draft.rangeModifier.value = 0;
          } else if (draft.use.targetDistance > thresholds.close) {
            const instances = Math.ceil(
              (draft.use.targetDistance - thresholds.close) / 2,
            );
            draft.rangeModifier.name = `${localize(
              'beyondRange',
            )} x${instances}`;
            draft.rangeModifier.value = instances * -10;
          }

          draft.modifiers.simple.set(
            draft.rangeModifier.id,
            draft.rangeModifier,
          );
        }
      }),
    };

    for (const attackTarget of this.use.attackTargets) {
      for (const [effect, active] of this.getAttackTargetEffects(
        attackTarget,
        this.skillState.skill,
        this.action,
      ) || []) {
        this.modifiers.effects.set(effect, active);
      }
    }

    const thresholds = psiRangeThresholds(
      freePush === PsiPush.IncreasedRange ? 1 : 0,
    );
    if (this.use.targetDistance <= thresholds.pointBlank) {
      this.rangeModifier.name = `${localize('range')}: ${localize(
        PsiRange.PointBlank,
      )}`;
      this.rangeModifier.value = 10;
    } else if (this.use.targetDistance > thresholds.close) {
      const instances = Math.ceil(
        (this.use.targetDistance - thresholds.close) / 2,
      );
      this.rangeModifier.name = `${localize('beyondRange')} x${instances}`;
      this.rangeModifier.value = instances * -10;
    }

    this.modifiers.simple.set(this.rangeModifier.id, this.rangeModifier);
  }

  get fullSideEffectNegationPoints() {
    return this.use.push ? 2 : 1;
  }

  get mainPool() {
    return this.ego.useThreat ? PoolType.Threat : PoolType.Moxie;
  }

  get psi() {
    return this.character.psi;
  }

  get freePush() {
    return this.psi?.activeFreePush;
  }

  get disabledPushes() {
    const pushes: PsiPush[] = [];
    const { activeFreePush } = this.psi ?? {};
    const { attack, duration } = this.use.sleight;
    if (activeFreePush && activeFreePush !== PsiPush.ExtraTarget) {
      pushes.push(activeFreePush);
    }
    if (
      [SleightDuration.Instant, SleightDuration.Sustained].includes(duration)
    ) {
      pushes.push(PsiPush.IncreasedDuration);
    }
    if (attack.rollFormulas.length === 0 || attack.armorUsed.length === 0) {
      pushes.push(PsiPush.IncreasedPenetration);
    }
    return pushes;
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
    const { settings, pools, action, name, techSource } = this;
    const { sleight, push, sideEffectNegation, attackTargets } = this.use;
    await createMessage({
      data: {
        header: {
          heading: sleight.name,
          // TODO: Maybe add specializations to subheadings
          subheadings: compact([
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
          description: sleight.description,
        },
        successTest: {
          ...this.testMessageData,
          defaultSuperiorEffect: sleight.hasAttack
            ? SuperiorResultEffect.Damage
            : undefined,
        },
        psiTest: {
          sleight: sleight.getDataCopy(),
          freePush: this.psi?.activeFreePush,
          push: push,
          sideEffectNegation: push
            ? sideEffectNegation === 2
              ? 'all'
              : sideEffectNegation === 1
              ? 'damage'
              : ''
            : sideEffectNegation
            ? 'all'
            : '',
          variableInfection: !!this.psi?.hasVariableInfection,
          willpower: this.ego.aptitudes.wil,
        },

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
      entity: this.token ?? this.character,
      visibility: settings.visibility,
    });

    this.character.updater.batchCommits(async () => {
      if (this.psi?.hasVariableInfection) {
        await this.psi.updateInfectionRating(
          this.psi.infectionRating + sleight.infectionMod * (push ? 2 : 1),
        );
      }
      if (sideEffectNegation) {
        const { mainPool } = this;
        const activePoolUse = pools.active?.[0].type;
        if (activePoolUse === mainPool) {
          this.character.addToSpentPools({
            pool: mainPool,
            points: 1 + sideEffectNegation,
          });
        } else {
          this.character.addToSpentPools(
            ...compact([
              { pool: mainPool, points: sideEffectNegation },
              activePoolUse && { pool: activePoolUse, points: 1 },
            ]),
          );
        }
      } else if (pools.active) {
        this.character?.addToSpentPools({
          pool: pools.active[0].type,
          points: 1,
        });
      }
    });
  }
}
