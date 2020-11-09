import { AptitudeType, enumValues } from '@src/data-enums';
import { LangEntry, localize } from '@src/foundry/localization';
import { compact } from 'remeda';
import type { SetRequired } from 'type-fest';
import { createFeature } from './feature-helpers';

export type Aptitudes = Record<AptitudeType, number>;

export enum FieldSkillType {
  Exotic = 'exotic',
  Hardware = 'hardware',
  Know = 'know',
  Medicine = 'medicine',
  Pilot = 'pilot',
}

export enum SkillType {
  Athletics = 'athletics',
  Deceive = 'deceive',
  Fray = 'fray',
  FreeFall = 'freeFall',
  Guns = 'guns',
  Infosec = 'infosec',
  Infiltrate = 'infiltrate',
  Interface = 'interface',
  Kinesics = 'kinesics',
  Melee = 'melee',
  Perceive = 'perceive',
  Persuade = 'persuade',
  Program = 'program',
  Provoke = 'provoke',
  Psi = 'psi',
  Research = 'research',
  Survival = 'survival',
}

export enum ActiveSkillCategory {
  Combat = 'combat',
  Mental = 'mental',
  Misc = 'misc',
  Physical = 'physical',
  Social = 'social',
  Technical = 'technical',
  Vehicle = 'vehicle',
}

export enum KnowSkillCategory {
  Academics = 'academics',
  Arts = 'arts',
  Interests = 'interests',
  ProfessionalTraining = 'professionalTraining',
}

type Info = Readonly<{
  category: ActiveSkillCategory;
  linkedAptitude: AptitudeType;
  aptMultiplier?: 0 | 1 | 2;
}>;

export type SkillData = { points: number; specialization: string };
export type FieldSkillData = SkillData & {
  field: string;
  linkedAptitude: AptitudeType;
  category: ActiveSkillCategory | KnowSkillCategory;
};

export const createFieldSkillData = createFeature<FieldSkillData>(() => ({
  points: 0,
  specialization: '',
  field: '',
  linkedAptitude: AptitudeType.Cognition,
  category: ActiveSkillCategory.Misc,
}));

export type FullSkill = {
  points: number;
  specialization: string;
  total: number;
  skill: SkillType;
  name: string;
  fullName: string;
  aptitudePoints: number;
  aptBonus: number;
} & SetRequired<Info, 'aptMultiplier'>;

export type FullFieldSkill = Omit<FullSkill, 'skill' | 'category'> &
  FieldSkillData & {
    fieldSkill: FieldSkillType;
    readonly nameWithoutFieldType: string;
  };

const social: Info = {
  category: ActiveSkillCategory.Social,
  linkedAptitude: AptitudeType.Savvy,
};

const cogTechnical: Info = {
  category: ActiveSkillCategory.Technical,
  linkedAptitude: AptitudeType.Cognition,
};

const somPhysical: Info = {
  category: ActiveSkillCategory.Physical,
  linkedAptitude: AptitudeType.Somatics,
};

const refPhysical: Info = {
  category: ActiveSkillCategory.Physical,
  linkedAptitude: AptitudeType.Reflexes,
};

export const skillInfo: Readonly<Record<SkillType, Info>> = {
  [SkillType.Athletics]: somPhysical,
  [SkillType.Deceive]: social,
  [SkillType.Fray]: {
    category: ActiveSkillCategory.Combat,
    linkedAptitude: AptitudeType.Reflexes,
    aptMultiplier: 2,
  } as Info,
  [SkillType.FreeFall]: somPhysical,
  [SkillType.Guns]: {
    category: ActiveSkillCategory.Combat,
    linkedAptitude: AptitudeType.Reflexes,
  } as Info,
  [SkillType.Infiltrate]: refPhysical,
  [SkillType.Infosec]: cogTechnical,
  [SkillType.Interface]: cogTechnical,
  [SkillType.Kinesics]: social,
  [SkillType.Melee]: {
    category: ActiveSkillCategory.Combat,
    linkedAptitude: AptitudeType.Somatics,
  } as Info,
  [SkillType.Perceive]: {
    category: ActiveSkillCategory.Mental,
    linkedAptitude: AptitudeType.Intuition,
    aptMultiplier: 2,
  } as Info,
  [SkillType.Persuade]: social,
  [SkillType.Program]: cogTechnical,
  [SkillType.Provoke]: social,
  [SkillType.Psi]: {
    category: ActiveSkillCategory.Mental,
    linkedAptitude: AptitudeType.Willpower,
  } as Info,
  [SkillType.Research]: {
    category: ActiveSkillCategory.Technical,
    linkedAptitude: AptitudeType.Intuition,
  } as Info,
  [SkillType.Survival]: {
    category: ActiveSkillCategory.Mental,
    linkedAptitude: AptitudeType.Intuition,
  } as Info,
} as const;

export enum CommonExoticField {
  AnimalHandling = 'animalHandling',
  Bow = 'bow',
  Disguise = 'disguise',
  EscapeArtist = 'escapeArtist',
  PlasmaCutter = 'plasmaCutter',
  SleightOfHand = 'sleightOfHand',
  ThrowingKnives = 'throwingKnives',
  Whips = 'whips',
}

export enum CommonHardwareField {
  Aerospace = 'aerospace',
  Armorer = 'armorer',
  Demolitions = 'demolitions',
  Electronics = 'electronics',
  GroundCraft = 'groundcraft',
  Industrial = 'industrial',
  Nautical = 'nautical',
  Robotics = 'robotics',
}

export enum CommonMedicineField {
  Biotech = 'biotech',
  Forensics = 'forensics',
  Paramedic = 'paramedic',
  Pharmacology = 'pharmacology',
  Psychosurgery = 'psychosurgery',
  Veterinary = 'veterinary',
}

export enum CommonPilotField {
  Air = 'air',
  Ground = 'ground',
  Nautical = 'nautical',
  Space = 'space',
}

export const fieldSkillInfo: Readonly<Record<
  FieldSkillType,
  {
    aptitudes: ReadonlyArray<AptitudeType>;
    categories: ReadonlyArray<ActiveSkillCategory | KnowSkillCategory>;
    sampleFields: ReadonlyArray<LangEntry>;
  }
>> = {
  [FieldSkillType.Exotic]: {
    get aptitudes() {
      return enumValues(AptitudeType);
    },
    get categories() {
      return enumValues(ActiveSkillCategory);
    },
    get sampleFields() {
      return enumValues(CommonExoticField);
    },
  },
  [FieldSkillType.Hardware]: {
    aptitudes: [AptitudeType.Cognition],
    categories: [ActiveSkillCategory.Technical],
    get sampleFields() {
      return enumValues(CommonHardwareField);
    },
  },
  [FieldSkillType.Medicine]: {
    aptitudes: [AptitudeType.Cognition],
    categories: [ActiveSkillCategory.Technical],
    get sampleFields() {
      return enumValues(CommonMedicineField);
    },
  },
  [FieldSkillType.Pilot]: {
    aptitudes: [AptitudeType.Reflexes],
    categories: [ActiveSkillCategory.Vehicle],
    get sampleFields() {
      return enumValues(CommonPilotField);
    },
  },
  [FieldSkillType.Know]: {
    aptitudes: [AptitudeType.Cognition, AptitudeType.Intuition],
    get categories() {
      return enumValues(KnowSkillCategory);
    },
    sampleFields: [],
  },
};

export const allSampleFields = Object.values(fieldSkillInfo).flatMap(
  ({ sampleFields }) => sampleFields || [],
);

export const isFieldSkill = (skill: Skill): skill is FullFieldSkill => {
  return 'fieldSkill' in skill;
};

type SkillFilterData = {
  fullName: string;
  category: ActiveSkillCategory | KnowSkillCategory;
  linkedAptitude?: AptitudeType;
};

export const skillFilterCheck = (filter: string) => {
  const reg = new RegExp(filter, 'i');
  return ({ fullName, category, linkedAptitude }: SkillFilterData) => {
    return !reg.test(
      compact([
        fullName,
        localize(category),
        linkedAptitude ? localize('FULL', linkedAptitude) : '',
      ]).join('__'),
    );
  };
};

export type SkillFilterCheck = ReturnType<typeof skillFilterCheck>;

export type FieldSkillIdentifier = {
  fieldSkill: FieldSkillType;
  field: string;
};
export const fieldSkillName = ({ fieldSkill, field }: FieldSkillIdentifier) => {
  return `${localize(fieldSkill)}: ${field}`;
};

// export const setupSkillFromEffect = (
//   effect: SkillEffect,
//   aptitudes: Aptitudes
// ): FullSkill | FullFieldSkill => {
//   const {
//     skillType,
//     total,
//     aptitudeMultiplier,
//     specialization,
//     field,
//     linkedAptitude: aptitude
//   } = effect;
//   if (isFieldSkillEffect(skillType)) {
//     return setupFullFieldSkill(
//       {
//         field,
//       },
//       aptitudes
//     );
//   }
//   const { category } = skillInfo[skillType];
//   return {

//   }
// };

export const setupFullSkill = (
  skillData: SkillData & { skill: SkillType },
  aptitudes: Aptitudes,
): FullSkill => {
  const data = { ...skillData, ...skillInfo[skillData.skill] };
  return {
    ...data,
    aptMultiplier: data.aptMultiplier ?? 1,
    aptitudePoints: aptitudes[data.linkedAptitude],
    name: localize(skillData.skill),
    get aptBonus(): number {
      return this.aptitudePoints * this.aptMultiplier;
    },
    get total(): number {
      return this.points + this.aptBonus;
    },
    get fullName(): string {
      return this.specialization
        ? `${this.name} (${this.specialization})`
        : this.name;
    },
  };
};

export const setupFullFieldSkill = (
  fieldData: FieldSkillData & { fieldSkill: FieldSkillType },
  aptitudes: Aptitudes,
): FullFieldSkill => {
  return {
    ...fieldData,
    aptMultiplier: 1,
    aptitudePoints: aptitudes[fieldData.linkedAptitude],
    name: fieldSkillName({
      fieldSkill: fieldData.fieldSkill,
      field: fieldData.field,
    }),
    get nameWithoutFieldType() {
      return `${this.field} ${
        this.specialization ? `(${this.specialization})` : ''
      }`;
    },
    get aptBonus(): number {
      return this.aptitudePoints * this.aptMultiplier;
    },
    get total(): number {
      return this.points + this.aptBonus;
    },
    get fullName(): string {
      return this.specialization
        ? `${this.name} (${this.specialization})`
        : this.name;
    },
  };
};

export type Skill = FullSkill | FullFieldSkill;
