import { AptitudeType } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { uniq, createPipe, map } from 'remeda';
import type { ActionType, ActionSubtype } from './actions';
import { createFeature } from './feature-helpers';
import { RepNetwork } from './reputations';
import {
  SkillType,
  FieldSkillType,
  ActiveSkillCategory,
  KnowSkillCategory,
  fieldSkillName,
} from './skills';

export enum TagType {
  AllActions = 'allActions',
  Action = 'action',
  AptitudeChecks = 'aptitudeCheck',
  LinkedAptitude = 'linkedAptitude',
  Skill = 'skill',
  FieldSkill = 'fieldSkill',
  SkillCategory = 'skillCategory',
  Rep = 'rep',
  Special = 'special',
}

export enum SpecialTest {
  Integration = 'integration',
  ResleevingStress = 'resleevingStress',
  ResistSubstance = 'resistSubstanceOrDisease',
  PainResistance = 'painResistance',
  ResistInfection = 'resistInfection',
  Shock = 'shock',
  Blinding = 'blinding',
  Entangling = 'entangling',
  Knockdown = 'knockdown',
  Stun = 'stun',
  Unconsciousness = "unconsciousness",
  BleedingOut = "bleedingOut",
  Disorientation = "disorientation",
  AcuteStress = "acuteStress"
}

export type UniversalTag = {
  type: TagType.AllActions;
};
export type ActionTag = {
  type: TagType.Action;
  action: ActionType | '';
  subtype: ActionSubtype | '';
};
export type ChecksTag = {
  type: TagType.AptitudeChecks;
  aptitude: AptitudeType;
};
export type LinkedAptitudeTag = {
  type: TagType.LinkedAptitude;
  aptitude: AptitudeType;
};
export type SkillTag = {
  type: TagType.Skill;
  skillType: SkillType;
};
export type FieldSkillTag = {
  type: TagType.FieldSkill;
  fieldSkill: FieldSkillType;
  field: string;
};
export type SkillCategoryTag = {
  type: TagType.SkillCategory;
  category: ActiveSkillCategory | KnowSkillCategory;
};
export type RepTag = {
  type: TagType.Rep;
  network: RepNetwork;
};
export type SpecialTag = {
  type: TagType.Special;
  test: SpecialTest;
};

export type Tag =
  | UniversalTag
  | ActionTag
  | ChecksTag
  | LinkedAptitudeTag
  | SkillTag
  | FieldSkillTag
  | SkillCategoryTag
  | RepTag
  | SpecialTag;

// const allActions = createFeature<UniversalTag>(() => ({
//   type: TagType.AllActions,
// }));
const action = createFeature<ActionTag>(() => ({
  type: TagType.Action,
  action: '',
  subtype: '',
}));

const aptitudeCheck = createFeature<ChecksTag>(() => ({
  type: TagType.AptitudeChecks,
  aptitude: AptitudeType.Cognition,
}));

const linkedAptitude = createFeature<LinkedAptitudeTag>(() => ({
  type: TagType.LinkedAptitude,
  aptitude: AptitudeType.Cognition,
}));

const skill = createFeature<SkillTag>(() => ({
  type: TagType.Skill,
  skillType: SkillType.Athletics,
}));

const fieldSkill = createFeature<FieldSkillTag>(() => ({
  type: TagType.FieldSkill,
  fieldSkill: FieldSkillType.Exotic,
  field: '',
}));

const skillCategory = createFeature<SkillCategoryTag>(() => ({
  type: TagType.SkillCategory,
  category: ActiveSkillCategory.Combat,
}));

const rep = createFeature<RepTag>(() => ({
  type: TagType.Rep,
  network: RepNetwork.Anarchist,
}));

const special = createFeature<SpecialTag>(() => ({
  type: TagType.Special,
  test: SpecialTest.Integration,
}));

export const createTag = {
  allActions: action,
  action,
  aptitudeCheck,
  linkedAptitude,
  skill,
  fieldSkill,
  skillCategory,
  rep,
  special,
} as const;

export const formatTag = (tag: Tag) => {
  switch (tag.type) {
    case TagType.Action:
      return `${uniq([
        localize(tag.action ? tag.action : 'all'),
        localize(tag.subtype ? tag.subtype : 'all'),
      ]).join(' ')} ${localize('actions')}`;

    case TagType.AptitudeChecks:
      return `${localize(tag.aptitude)} ${localize('checks')}`;

    case TagType.AllActions:
      return localize('allActions');

    case TagType.LinkedAptitude:
      return `${localize('linkedAptitude')} ${localize(
        tag.aptitude,
      )} ${localize('skillTests')}`;

    case TagType.Skill:
      return `${localize(tag.skillType)} ${localize('tests')}`;

    case TagType.FieldSkill:
      return `${
        tag.field ? fieldSkillName(tag) : localize(tag.fieldSkill)
      } ${localize('tests')}`;

    case TagType.SkillCategory:
      return `${localize(tag.category)} ${localize('skills')}`;

    case TagType.Rep:
      return localize(tag.network);

    case TagType.Special:
      return `${localize(tag.test)} ${localize('tests')}`;
  }
};

export const formatEffectTags = createPipe(map(formatTag), (formatted) =>
  formatted.join(', ').replace(/,([^,]*)$/, ' /$1'),
);

//   formatted.join(", ").replace(/,([^,]*)$/, " and $1")
