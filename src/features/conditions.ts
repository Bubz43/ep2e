import type { DescriptionEntry } from '@src/foundry/lang-schema';
import { localize } from '@src/foundry/localization';
import { fromPairs } from '@src/utility/helpers';
import { foundryIcon, localImage } from '@src/utility/images';
import { ActionSubtype } from './actions';
import { createEffect, Effect } from './effects';
import { createFeature } from './feature-helpers';
import { SkillType } from './skills';
import { TagType } from './tags';

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

export const iconToCondition = new Map<string, ConditionType>(
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
