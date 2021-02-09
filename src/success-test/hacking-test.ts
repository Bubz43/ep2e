import { createMessage } from '@src/chat/create-message';
import { SuperiorResultEffect } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import type { Software } from '@src/entities/item/proxies/software';
import {
  Action,
  ActionSubtype,
  ActionType,
  createAction,
} from '@src/features/actions';
import { matchesSkill, Source } from '@src/features/effects';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { arrayOf } from '@src/utility/helpers';
import type { WithUpdate } from '@src/utility/updating';
import { compact, last, merge } from 'remeda';
import type { SetRequired } from 'type-fest';
import { SkillTest, SkillTestInit } from './skill-test';
import {
  grantedSuperiorResultEffects,
  successTestEffectMap,
} from './success-test';

type SoftwareAttack = {
  software?: Software | null;
  primaryAttack: boolean;
};

export type HackingTestInit = SetRequired<SkillTestInit, 'character'> &
  SoftwareAttack;

export class HackingTest extends SkillTest {
  readonly hack: WithUpdate<
    SoftwareAttack & {
      attackTarget?: Token | null;
    }
  >;

  readonly character: Character;

  constructor({ software, primaryAttack, ...init }: HackingTestInit) {
    super({
      ...init,
      action:
        init.action ??
        createAction({
          type: ActionType.Complex,
          subtype: ActionSubtype.Mesh,
        }),
    });
    this.character = init.character;
    this.hack = {
      software,
      primaryAttack,
      attackTarget: [...game.user.targets][0],
      update: this.recipe((draft, changed) => {
        draft.hack = merge(draft.hack, changed);
        if (changed.software) {
          draft.hack.primaryAttack = true;
        }
        if (changed.attackTarget) {
          draft.modifiers.effects = this.getModifierEffects(
            draft.skillState.skill,
            draft.action,
          );
        }
      }),
    };

    if (this.hack.attackTarget) {
      for (const [effect, active] of this.getAttackTargetEffects(
        this.hack.attackTarget,
        this.skillState.skill,
        this.action,
      ) || []) {
        this.modifiers.effects.set(effect, active);
      }
    }
  }

  get attack() {
    const { software, primaryAttack } = this.hack;
    if (!software) return null;
    return primaryAttack
      ? software.attacks.primary
      : software.attacks.secondary || software.attacks.primary;
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
    const { settings, pools, action, hack, testMessageData } = this;

    const { software, primaryAttack, attackTarget } = hack;

    await createMessage({
      data: {
        header: {
          heading: `${software?.name || ''} ${localize('hacking')} ${localize(
            'test',
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
          img: software?.nonDefaultImg,
          description: software?.description,
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
        // hack
      },

      entity: this.token ?? this.character,
      visibility: settings.visibility,
    });

    if (pools.active) {
      this.character?.modifySpentPools({
        pool: pools.active[0].type,
        points: 1,
      });
    }
  }
}
