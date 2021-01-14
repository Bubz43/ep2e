import { PoolType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Action } from '@src/features/actions';
import { matchesSkill } from '@src/features/effects';
import { Pool, PreTestPoolAction } from '@src/features/pool';
import type { Skill } from '@src/features/skills';
import type { Draft } from 'immer/dist/internal';
import { compact, equals } from 'remeda';
import type { PreTestPool, SuccessTestPools } from './success-test';
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

    this.pools.available = this.getPools(this.skillState.skill);;
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

  private getPools(skill: Skill) {
    const poolMap = this.character?.pools;
    return compact(
      this.ego.useThreat
        ? [poolMap?.get(PoolType.Threat)]
        : [
            poolMap?.get(Pool.linkedToAptitude(skill.linkedAptitude)),
            poolMap?.get(PoolType.Flex),
          ],
    );
  }

}
