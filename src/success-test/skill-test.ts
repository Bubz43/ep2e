import { createMessage } from '@src/chat/create-message';
import type { SuccessTestMessage } from '@src/chat/message-data';
import { PoolType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Action } from '@src/features/actions';
import { matchesSkill } from '@src/features/effects';
import { Pool } from '@src/features/pool';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { compact, map } from 'remeda';
import { rollSuccessTest } from './success-test';
import { SuccessTestBase } from './success-test-base';

export type SkillTestInit = {
  ego: Ego;
  skill: Skill;
  character?: Character;
  token?: MaybeToken;
  action?: Action;
};

export class SkillTest extends SuccessTestBase {
  readonly ego;
  readonly character;
  readonly token;
  readonly skillState: {
    skill: Skill;
    applySpecialization: boolean;
    replaceSkill: (newSkill: Skill) => void;
    toggleSpecialization: () => void;
  };

  get basePoints() {
    const { skill, applySpecialization } = this.skillState;
    return skill.total + (applySpecialization ? 10 : 0);
  }

  constructor({ ego, skill, character, token, action }: SkillTestInit) {
    super({ action });
    this.ego = ego;
    this.character = character;
    this.token = token;

    this.skillState = {
      skill,
      applySpecialization: false,
      toggleSpecialization: () => {
        this.update(({ skillState }) => {
          skillState.applySpecialization = !skillState.applySpecialization;
        });
      },
      replaceSkill: (newSkill) => {
        this.update((draft) => {
          const { skillState, pools, modifiers } = draft;
          skillState.skill = newSkill;
          skillState.applySpecialization = false;
          pools.available = this.getPools(newSkill);
          this.togglePool(draft, null);
          modifiers.effects = this.getModifierEffects(newSkill, this.action);
        });
      },
    };

    this.pools.available = this.getPools(this.skillState.skill);
    this.modifiers.effects = this.getModifierEffects(
      this.skillState.skill,
      this.action,
    );
  }

  private getModifierEffects(skill: Skill, action: Action) {
    return new Map(
      (
        this.character?.appliedEffects.getMatchingSuccessTestEffects(
          matchesSkill(skill)(action),
          false,
        ) || []
      ).map((effect) => [effect, false]),
    );
  }

  private getLinkedPool(skill: Skill) {
    return Pool.linkedToAptitude(skill.linkedAptitude);
  }

  private getPools(skill: Skill) {
    const poolMap = this.character?.pools;
    return compact(
      this.ego.useThreat
        ? [poolMap?.get(PoolType.Threat)]
        : [
            poolMap?.get(this.getLinkedPool(skill)),
            poolMap?.get(PoolType.Flex),
          ],
    );
  }

  protected async createMessage() {
    const {
      ignoreModifiers,
      clampedTarget,
      skillState,
      settings,
      pools,
      action,
    } = this;
    const { skill, applySpecialization } = skillState; // TODO Aptitude stuff
    const data: SuccessTestMessage = {
      parts: compact([
        { name: skillState.skill.name, value: skillState.skill.points },
        { name: localize(skill.linkedAptitude), value: skill.aptitudePoints },
        applySpecialization && { name: skill.specialization, value: 10 },
        ...(ignoreModifiers ? [] : this.modifiersAsParts),
      ]),
      states: [
        {
          target: clampedTarget,
          ...(settings.autoRoll
            ? rollSuccessTest({ target: clampedTarget })
            : {}),
          action: pools.active
            ? [pools.active[0].type, pools.active[1]]
            : 'initial',
        },
      ],
      ignoredModifiers: ignoreModifiers ? this.modifierTotal : undefined,
      linkedPool: this.getLinkedPool(skill),
    };

    await createMessage({
      data: {
        header: {
          heading: `${skill.name} ${localize('test')}`,
          subheadings: compact([
            applySpecialization && skill.specialization,
            map([action.type, action.subtype, 'action'], localize).join(' '),
          ]),
        },
        successTest: data,
      },
      entity: this.token ?? this.character, // TODO account for item sources,
      visibility: settings.visibility,
    });

    if (pools.active) {
      this.character?.spendPool({ pool: pools.active[0].type, points: 1 });
    }
  }
}
