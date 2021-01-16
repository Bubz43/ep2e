import { createMessage } from '@src/chat/create-message';
import type { SuccessTestMessageData } from '@src/chat/message-data';
import { PoolType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  Action,
  actionTimeframeModifier,
  ActionType,
  createAction,
  defaultCheckActionSubtype,
} from '@src/features/actions';
import { matchesSkill } from '@src/features/effects';
import { Pool } from '@src/features/pool';
import { complementarySkillBonus, Skill } from '@src/features/skills';
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

export const skillLinkedAptitudeMultipliers = [0, 1, 2] as const;

export class SkillTest extends SuccessTestBase {
  readonly ego;
  readonly character;
  readonly token;
  readonly skillState: {
    skill: Skill;
    applySpecialization: boolean;
    aptitudeMultiplier: number;
    halveBase: boolean;
    complementarySkill?: Skill | null;
    setComplementarySkill: (skill: Skill | null) => void;
    toggleHalveBase: () => void;
    cycleAptitudeMultiplier: () => void;
    replaceSkill: (newSkill: Skill) => void;
    toggleSpecialization: () => void;
  };

  get basePoints() {
    const {
      skill,
      applySpecialization,
      aptitudeMultiplier,
      halveBase,
      complementarySkill,
    } = this.skillState;
    const base = skill.points + skill.aptitudePoints * aptitudeMultiplier;
    return (
      Math.round(base * (halveBase ? 0.5 : 1)) +
      (applySpecialization ? 10 : 0) +
      (complementarySkill ? complementarySkillBonus(complementarySkill) : 0)
    );
  }

  constructor({ ego, skill, character, token, action }: SkillTestInit) {
    super({
      action:
        action ??
        createAction({
          type: ActionType.Automatic, // TODO better default
          subtype: defaultCheckActionSubtype(skill.linkedAptitude),
        }),
    });
    this.ego = ego;
    this.character = character;
    this.token = token;

    this.skillState = {
      skill,
      applySpecialization: false,
      halveBase: false,
      aptitudeMultiplier: skill.aptMultiplier,
      setComplementarySkill: (skill) => {
        this.update(
          ({ skillState }) => void (skillState.complementarySkill = skill),
        );
      },
      toggleHalveBase: () => {
        this.update(({ skillState }) => {
          skillState.halveBase = !skillState.halveBase;
        });
      },
      cycleAptitudeMultiplier: () => {
        this.update(({ skillState }) => {
          const { aptitudeMultiplier } = skillState;
          const index = skillLinkedAptitudeMultipliers.findIndex(
            (i) => i === aptitudeMultiplier,
          );
          skillState.aptitudeMultiplier =
            skillLinkedAptitudeMultipliers[index + 1] ?? 0;
        });
      },
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
          skillState.aptitudeMultiplier = newSkill.aptMultiplier;
          skillState.halveBase = false;
          skillState.complementarySkill = null;
          pools.available = this.getPools(newSkill);
          this.togglePool(draft, null);
          this.updateAction(
            draft,
            createAction({
              type: draft.action.type,
              subtype: defaultCheckActionSubtype(newSkill.linkedAptitude),
            }),
          );
          modifiers.effects = this.getModifierEffects(newSkill, draft.action);
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
      ).map((effect) => [effect, !effect.requirement]),
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
    const {
      skill,
      applySpecialization,
      aptitudeMultiplier,
      halveBase,
      complementarySkill,
    } = skillState; 

    const name = `${skill.name} ${localize('test')}`;
    
    const data: SuccessTestMessageData = {
      parts: compact([
        {
          name: `${skillState.skill.name} ${halveBase ? '÷2' : ''}`,
          value: skillState.skill.points,
        },
        {
          name: `${localize(skill.linkedAptitude)} ${
            halveBase ? `(÷2)` : ''
          } x${aptitudeMultiplier}`,
          value: skill.aptitudePoints * aptitudeMultiplier,
        },
        applySpecialization && {
          name: `[${localize('specialization')}] ${skill.specialization}`,
          value: 10,
        },
        complementarySkill && {
          name: `[${localize('complementary')}] ${complementarySkill.name}`,
          value: complementarySkillBonus(complementarySkill),
        },
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
      task: action.timeframe
        ? {
            name,
            timeframe: action.timeframe,
            actionSubtype: action.subtype,
            modifier: actionTimeframeModifier(action).modifier,
          }
        : undefined,
    };

    await createMessage({
      data: {
        header: {
          heading: name,
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
