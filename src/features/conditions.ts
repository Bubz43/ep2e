import { AptitudeType, AttackTrait } from '@src/data-enums';
import type { DescriptionEntry } from '@src/foundry/lang-schema';
import { localize } from '@src/foundry/localization';
import { fromPairs } from '@src/utility/helpers';
import { foundryIcon, localImage } from '@src/utility/images';
import { compact } from 'remeda';
import { ActionSubtype } from './actions';
import { ArmorType } from './active-armor';
import { createEffect, Effect } from './effects';
import { createFeature } from './feature-helpers';
import { SkillType } from './skills';
import { TagType } from './tags';
import { CommonInterval, prettyMilliseconds } from './time';

export enum ConditionType {
  Blinded = 'blinded',
  Confused = 'confused',
  Dazed = 'dazed',
  Deafened = 'deafened',
  Grappled = 'grappled',
  Immobilized = 'immobilized',
  Incapacitated = 'incapacitated',
  Prone = 'prone',
  Stunned = 'stunned',
  Unconscious = 'unconscious',
}

const conditionIconPairs = [
  [ConditionType.Blinded, foundryIcon('blind')],
  [ConditionType.Confused, localImage('icons/condition/uncertainty.svg')],
  [ConditionType.Dazed, foundryIcon('daze')],
  [ConditionType.Deafened, foundryIcon('deaf')],
  [ConditionType.Grappled, foundryIcon('net')],
  [ConditionType.Immobilized, foundryIcon('statue')],
  [ConditionType.Prone, foundryIcon('falling')],
  [ConditionType.Unconscious, foundryIcon('unconscious')],
  [ConditionType.Incapacitated, foundryIcon('sleep')],
  [ConditionType.Stunned, localImage('icons/condition/oppression.svg')],
] as const;

export const conditionIcons = fromPairs(conditionIconPairs);

export const iconToCondition = new Map(
  conditionIconPairs.map(([condition, icon]) => [icon, condition]),
);

export const conditionSync = (
  actorConditionTextures: string[],
  tokenEffects: string[] = [],
) => {
  return [
    ...new Set(
      tokenEffects
        .filter((e) =>
          iconToCondition.has(e) ? actorConditionTextures.includes(e) : true,
        )
        .concat(actorConditionTextures),
    ),
  ];
};

const miscEffect = (condition: DescriptionEntry) =>
  createEffect.misc({ description: localize('DESCRIPTIONS', condition) });

export const getConditionEffects = (condition: ConditionType): Effect[] => {
  switch (condition) {
    case ConditionType.Blinded:
      // TODO: Blind Attacks, Test to Move faster than base
      return [
        createEffect.successTest({
          modifier: -30,
          requirement: localize('visionBased'),
          tags: [
            {
              type: TagType.Action,
              subtype: ActionSubtype.Physical,
              action: '',
            },
          ],
        }),
        miscEffect(condition),
      ];
    case ConditionType.Confused:
      // TODO: Confusion Roll Table
      return [miscEffect(condition)];
    case ConditionType.Dazed:
      // TODO: Prevent Actions
      return [miscEffect(condition)];
    case ConditionType.Deafened:
      return [
        createEffect.initiative({ modifier: -3 }),
        createEffect.successTest({
          modifier: -30,
          requirement: localize('hearingBased'),
          tags: [{ type: TagType.Skill, skillType: SkillType.Perceive }],
        }),
      ];
    case ConditionType.Grappled:
      // TODO: Movement 0
      return [
        createEffect.successTest({
          modifier: -30,
          requirement: 'Attack outside grapple',
          tags: [{ type: TagType.Skill, skillType: SkillType.Fray }],
        }),
        miscEffect(condition),
      ];
    case ConditionType.Immobilized:
      return [miscEffect(condition)];
    case ConditionType.Incapacitated:
      return [miscEffect(condition)];
    case ConditionType.Prone:
      return [
        miscEffect(condition),
        createEffect.successTest({
          modifier: 20,
          requirement: 'Standing/Oriented in melee range',
          toOpponent: true,
          tags: [{ type: TagType.AllActions }],
        }),
        createEffect.successTest({
          modifier: -10,
          toOpponent: true,
          requirement: 'Range or futher ranged attack in gravity',
          tags: [{ type: TagType.AllActions }],
        }),
      ];
    case ConditionType.Stunned:
      return [
        createEffect.successTest({
          modifier: -30,
          tags: [
            {
              type: TagType.Action,
              subtype: ActionSubtype.Physical,
              action: '',
            },
          ],
        }),
        createEffect.successTest({
          modifier: -10,
          tags: [
            { type: TagType.Action, subtype: ActionSubtype.Mental, action: '' },
          ],
        }),
      ];
    case ConditionType.Unconscious:
      return [miscEffect(condition)];
  }
};

export type CheckResultInfo = {
  condition: ConditionType | '';
  staticDuration: number;
  variableDuration: string;
  stress: string;
  impairment: number;
  notes: string;
};

export type CheckFailureInfo = CheckResultInfo & {
  additionalDurationPerSuperior: number;
};



export const createCheckResultInfo = createFeature<CheckResultInfo>(() => ({
  condition: '',
  staticDuration: 0,
  variableDuration: '',
  stress: '',
  impairment: 0,
  notes: '',
}));

export enum CheckResultState {
  CheckSuccess = 'checkSuccess',
  CheckFailure = 'checkFailure',
  CriticalFailure = 'criticalCheckFailure',
}

export type AptitudeCheckInfo = {
  check: AptitudeType | '';
  checkModifier: number;
  armorAsModifier: ArmorType | '';
  checkSuccess: CheckResultInfo[];
  checkFailure: CheckFailureInfo[];
  criticalCheckFailure: CheckResultInfo[];
};

export const formatCheckResultInfo = (
  entry: AptitudeCheckInfo[CheckResultState][number],
) => {
  const { condition, staticDuration: duration, impairment } = entry;
  const effect = compact([
    condition && localize(condition),
    impairment && `${impairment} ${localize('impairmentModifier')}`,
  ]).join(` & `);
  return `${effect} ${localize('for')} ${prettyMilliseconds(duration)}`;
};

const conditionEffectFromAttackTrait = (
  trait: AttackTrait,
): AptitudeCheckInfo => {
  switch (trait) {
    case AttackTrait.Blinding:
      return {
        check: AptitudeType.Reflexes,
        checkModifier: 0,
        armorAsModifier: '',
        checkSuccess: [],
        checkFailure: [
          {
            ...createCheckResultInfo({
              condition: ConditionType.Blinded,
              staticDuration: CommonInterval.Turn,
            }),
            additionalDurationPerSuperior: CommonInterval.Turn,
          },
        ],
        criticalCheckFailure: [
          createCheckResultInfo({
            condition: ConditionType.Blinded,
            staticDuration: CommonInterval.Indefinite,
          }),
        ],
      };

    case AttackTrait.Entangling:
      return {
        check: AptitudeType.Reflexes,
        checkModifier: 0,
        armorAsModifier: '',
        checkSuccess: [],
        checkFailure: [
          {
            ...createCheckResultInfo({
              condition: ConditionType.Grappled,
              staticDuration: CommonInterval.Instant,
            }),
            additionalDurationPerSuperior: CommonInterval.Instant,
          },
        ],
        criticalCheckFailure: [],
      };

    case AttackTrait.Knockdown:
      return {
        check: AptitudeType.Somatics,
        checkModifier: 0,
        armorAsModifier: '',
        checkSuccess: [],
        checkFailure: [
          {
            ...createCheckResultInfo({
              condition: ConditionType.Prone,
              staticDuration: CommonInterval.Instant,
            }),
            additionalDurationPerSuperior: CommonInterval.Instant,
          },
        ],
        criticalCheckFailure: [],
      };

    case AttackTrait.Pain:
      return {
        check: AptitudeType.Willpower,
        checkModifier: 0,
        armorAsModifier: '',
        checkFailure: [
          {
            ...createCheckResultInfo({
              staticDuration: CommonInterval.Turn,
              impairment: -20,
            }),
            additionalDurationPerSuperior: 0,
          },
        ],
        checkSuccess: [],
        criticalCheckFailure: [],
      };

    case AttackTrait.Shock:
      return {
        check: AptitudeType.Somatics,
        checkModifier: 0,
        armorAsModifier: ArmorType.Energy,
        checkSuccess: [
          createCheckResultInfo({
            condition: ConditionType.Stunned,
            staticDuration: CommonInterval.Turn * 3,
          }),
        ],
        checkFailure: [
          {
            ...createCheckResultInfo({
              condition: ConditionType.Incapacitated,
              staticDuration: CommonInterval.Turn,
            }),
            additionalDurationPerSuperior: CommonInterval.Turn * 2,
          },
          {
            ...createCheckResultInfo({
              condition: ConditionType.Prone,
              staticDuration: CommonInterval.Instant,
            }),
            additionalDurationPerSuperior: 0,
          },
          {
            ...createCheckResultInfo({
              condition: ConditionType.Stunned,
              staticDuration: CommonInterval.Minute * 3,
            }),
            additionalDurationPerSuperior: 0,
          },
        ],
        criticalCheckFailure: [],
      };

    case AttackTrait.Stun:
      return {
        check: AptitudeType.Somatics,
        checkModifier: 0,
        armorAsModifier: ArmorType.Kinetic,
        checkSuccess: [],
        checkFailure: [
          {
            ...createCheckResultInfo({
              condition: ConditionType.Stunned,
              staticDuration: CommonInterval.Turn,
            }),
            additionalDurationPerSuperior: CommonInterval.Turn,
          },
        ],
        criticalCheckFailure: [
          createCheckResultInfo({
            condition: ConditionType.Incapacitated,
            staticDuration: CommonInterval.Turn,
          }),
          createCheckResultInfo({
            condition: ConditionType.Stunned,
            staticDuration: CommonInterval.Minute,
          }),
        ],
      };
  }
};
