import { createMessage } from '@src/chat/create-message';
import type { SuccessTestMessageData } from '@src/chat/message-data';
import { PoolType, SuperiorResultEffect } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import {
  Action,
  actionTimeframeModifier,
  ActionType,
  createAction,
  defaultCheckActionSubtype,
} from '@src/features/actions';
import { matchesSkill } from '@src/features/effects';
import { Pool } from '@src/features/pool';
import {
  complementarySkillBonus,
  isFieldSkill,
  Skill,
  SkillType,
} from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { arrayOf } from '@src/utility/helpers';
import { compact, last } from 'remeda';
import {
  grantedSuperiorResultEffects,
  rollSuccessTest,
  SimpleSuccessTestModifier,
  successTestEffectMap,
} from './success-test';
import { SuccessTestBase, SuccessTestBaseInit } from './success-test-base';

export type SkillTestInit = {
  ego: Ego;
  techSource?: PhysicalTech | null;
  skill: Skill;
  character?: Character;
  token?: MaybeToken;
  action?: Action;
  opposing?: { testName: string; messageId?: string };
  halve?: boolean;
  modifiers?: SimpleSuccessTestModifier[];
  quick?: boolean;
  onComplete?: SuccessTestBaseInit['onComplete'];
};

export type SkillState = {
  skill: Skill;
  applySpecialization: boolean;
  aptitudeMultiplier: number;
  halveBase: boolean;
  complementarySkill?: Skill | null | undefined;
  setComplementarySkill: (skill: Skill | null) => void;
  toggleHalveBase: () => void;
  cycleAptitudeMultiplier: () => void;
  replaceSkill: (newSkill: Skill) => void;
  toggleSpecialization: () => void;
};

export const skillLinkedAptitudeMultipliers = [0, 1, 2] as const;
const automaticSkills = new Set([SkillType.Perceive, SkillType.Fray]);

const defaultSkillAction = (skill: Skill) => {
  const subtype = defaultCheckActionSubtype(skill.linkedAptitude);
  let type = ActionType.Complex;
  if (!isFieldSkill(skill) && automaticSkills.has(skill.skill)) {
    type = ActionType.Automatic;
  }
  return { subtype, type };
};

export class SkillTest extends SuccessTestBase {
  readonly ego;
  readonly character;
  readonly token;
  readonly skillState: SkillState;
  readonly opposing;
  readonly techSource?: PhysicalTech | null;

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

  constructor({
    ego,
    skill,
    character,
    token,
    action,
    opposing,
    techSource,
    halve,
    modifiers,
    quick,
    onComplete,
  }: SkillTestInit) {
    super({
      action: action ?? createAction(defaultSkillAction(skill)),
      onComplete,
    });
    this.ego = ego;
    this.character = character;
    this.token = token;
    this.opposing = opposing;
    this.techSource = techSource;

    for (const modifier of modifiers || []) {
      this.modifiers.simple.set(modifier.id, modifier);
    }

    this.skillState = {
      skill,
      applySpecialization: false,
      halveBase: !!halve,
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
    if (!quick) {
      this.modifiers.effects = this.getModifierEffects(
        this.skillState.skill,
        this.action,
      );
    }
  }

  protected getModifierEffects(skill: Skill, action: Action) {
    if (this.techSource) return new Map();
    return successTestEffectMap(
      this.character?.appliedEffects.getMatchingSuccessTestEffects(
        matchesSkill(skill)(action),
        false,
      ) || [],
    );
  }

  protected getLinkedPool(skill: Skill) {
    return Pool.linkedToAptitude(skill.linkedAptitude);
  }

  protected getPools(skill: Skill) {
    if (this.techSource) return [];
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

  get name() {
    return `${this.skillState.skill.name} ${localize('test')}`;
  }

  protected async getTestMessageData(): Promise<SuccessTestMessageData> {
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
            ? await rollSuccessTest({ target: clampedTarget })
            : {}),
          action: pools.active
            ? [pools.active[0].type, pools.active[1]]
            : 'initial',
        },
      ],
      ignoredModifiers: ignoreModifiers ? this.modifierTotal : undefined,
      linkedPool: this.techSource ? undefined : this.getLinkedPool(skill),
      defaulting: skill.points === 0,
      task: action.timeframe
        ? {
            name: this.name,
            timeframe: action.timeframe,
            actionSubtype: action.subtype,
            modifiers: [actionTimeframeModifier(action)].flatMap((p) =>
              p.modifier ? { ...p, modifier: p.modifier * 100 } : [],
            ),
          }
        : undefined,
    };
    if (data.task) {
      (data.defaultSuperiorEffect = SuperiorResultEffect.Time),
        (data.superiorResultEffects = arrayOf({
          value: SuperiorResultEffect.Time,
          length: grantedSuperiorResultEffects(last(data.states)?.result),
        }));
    }
    return data;
  }

  protected async createMessage() {
    const { settings, pools, action, name, opposing, techSource } = this;

    const message = await createMessage({
      data: {
        header: {
          heading: opposing
            ? `${localize('opposing')}: ${opposing.testName}`
            : name,
          // TODO: Maybe add specializations to subheadings
          subheadings: compact([
            opposing && name,
            techSource?.name,
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
        },
        successTest: await this.getTestMessageData(),
        fromMessageId: opposing?.messageId,
      },
      entity: this.token ?? this.character,
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
