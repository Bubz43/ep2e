import { AptitudeType, AttackTrait } from '@src/data-enums';
import type { DescriptionEntry } from '@src/foundry/lang-schema';
import { localize } from '@src/foundry/localization';
import { fromPairs } from '@src/utility/helpers';
import { foundryIcon, localImage } from '@src/utility/images';
import { ActionSubtype } from './actions';
import { ArmorType } from './armor';
import { createEffect, Effect } from './effects';
import { createFeature } from './feature-helpers';
import { SkillType } from './skills';
import { TagType } from './tags';
import { CommonInterval } from './time';

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
  [
    ConditionType.Confused,
    localImage('images/icons/condition/uncertainty.svg'),
  ],
  [ConditionType.Dazed, foundryIcon('daze')],
  [ConditionType.Deafened, foundryIcon('deaf')],
  [ConditionType.Grappled, foundryIcon('net')],
  [ConditionType.Immobilized, foundryIcon('statue')],
  [ConditionType.Prone, foundryIcon('falling')],
  [ConditionType.Unconscious, foundryIcon('unconscious')],
  [ConditionType.Incapacitated, foundryIcon('sleep')],
  [ConditionType.Stunned, localImage('images/icons/condition/oppression.svg')],
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

type BaseEffectInfo = {
  condition: ConditionType | '';
  duration: number;
  impairment: number;
};

export type ConditionEffect = {
  check: AptitudeType;
  checkModifier: number;
  armorAsModifier: ArmorType | '';
  onCheckSuccess: BaseEffectInfo[];
  onCheckFailure: (BaseEffectInfo & {
    additionalDurationPerSuperior: number;
    notes: string;
  })[];
  onCriticalCheckFailure: (BaseEffectInfo & {
    notes: string;
  })[];
};

const conditionEffectFromAttackTrait = (
  trait: AttackTrait,
): ConditionEffect => {
  switch (trait) {
    case AttackTrait.Blinding:
      return {
        check: AptitudeType.Reflexes,
        checkModifier: 0,
        armorAsModifier: '',
        onCheckSuccess: [],
        onCheckFailure: [
          {
            condition: ConditionType.Blinded,
            duration: CommonInterval.Turn,
            impairment: 0,
            additionalDurationPerSuperior: CommonInterval.Turn,
            notes: '',
          },
        ],
        onCriticalCheckFailure: [
          {
            condition: ConditionType.Blinded,
            duration: CommonInterval.Indefinite,
            impairment: 0,
            notes: '',
          },
        ],
      };

    case AttackTrait.Entangling:
      return {
        check: AptitudeType.Reflexes,
        checkModifier: 0,
        armorAsModifier: '',
        onCheckSuccess: [],
        onCheckFailure: [
          {
            condition: ConditionType.Grappled,
            duration: CommonInterval.Instant,
            impairment: 0,
            additionalDurationPerSuperior: CommonInterval.Instant,
            notes: '',
          },
        ],
        onCriticalCheckFailure: [],
      };

    case AttackTrait.Knockdown:
      return {
        check: AptitudeType.Somatics,
        checkModifier: 0,
        armorAsModifier: '',
        onCheckSuccess: [],
        onCheckFailure: [
          {
            condition: ConditionType.Prone,
            duration: CommonInterval.Instant,
            impairment: 0,
            additionalDurationPerSuperior: CommonInterval.Instant,
            notes: '',
          },
        ],
        onCriticalCheckFailure: [],
      };

    case AttackTrait.Pain:
      return {
        check: AptitudeType.Willpower,
        checkModifier: 0,
        armorAsModifier: '',
        onCheckFailure: [
          {
            condition: '',
            duration: CommonInterval.Turn,
            impairment: -20,
            additionalDurationPerSuperior: 0,
            notes: '',
          },
        ],
        onCheckSuccess: [],
        onCriticalCheckFailure: [],
      };

    case AttackTrait.Shock:
      return {
        check: AptitudeType.Somatics,
        checkModifier: 0,
        armorAsModifier: ArmorType.Energy,
        onCheckSuccess: [
          {
            condition: ConditionType.Stunned,
            duration: CommonInterval.Turn * 3,
            impairment: 0,
          },
        ],
        onCheckFailure: [
          {
            condition: ConditionType.Incapacitated,
            duration: CommonInterval.Turn,
            impairment: 0,
            additionalDurationPerSuperior: CommonInterval.Turn * 2,
            notes: '',
          },
          {
            condition: ConditionType.Prone,
            duration: CommonInterval.Instant,
            impairment: 0,
            additionalDurationPerSuperior: 0,
            notes: '',
          },
          {
            condition: ConditionType.Stunned,
            duration: CommonInterval.Minute * 3,
            impairment: 0,
            additionalDurationPerSuperior: 0,
            notes: '',
          },
        ],
        onCriticalCheckFailure: [],
      };

    case AttackTrait.Stun:
      return {
        check: AptitudeType.Somatics,
        checkModifier: 0,
        armorAsModifier: ArmorType.Kinetic,
        onCheckSuccess: [],
        onCheckFailure: [
          {
            condition: ConditionType.Stunned,
            duration: CommonInterval.Turn,
            impairment: 0,
            additionalDurationPerSuperior: CommonInterval.Turn,
            notes: '',
          },
        ],
        onCriticalCheckFailure: [
          {
            condition: ConditionType.Incapacitated,
            duration: CommonInterval.Turn,
            impairment: 0,
            notes: '',
          },
          {
            condition: ConditionType.Stunned,
            duration: CommonInterval.Minute,
            impairment: 0,
            notes: '',
          },
        ],
      };
  }
};
