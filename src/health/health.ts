import type { Abbreviation } from '@src/foundry/lang-schema';
import { LangEntry, localize } from '@src/foundry/localization';
import type { ValuedProp } from '@src/utility/field-values';

type HealthProp<T extends LangEntry | Abbreviation> = ValuedProp<number, T>;

export type BasicHealthData = {
  /**
   * @minimum 0
   */
  damage: number;
  /**
   * @minimum 0
   */
  wounds: number;
  modifications: Record<HealthModificationMode, HealthModification[]>;
};

export enum HealthType {
  Mental = 'mental',
  Mesh = 'mesh',
  Physical = 'physical',
}

export enum PhysicalHealthSubtype {
  Bio = 'bio',
  Synth = 'synth',
}

export enum HealthModificationMode {
  Edit = 'edit',
  Heal = 'heal',
  Inflict = 'inflict',
}

export type HealthModification = {
  mode: HealthModificationMode;
  damage: number;
  wounds: number;
  source: string;
  timestamp: number;
};

export enum HealthStat {
  Derived = 'derived',
  Durability = 'durability',
  WoundsIgnored = 'woundsIgnored',
  WoundModifier = 'woundModifier',
  WoundThreshold = 'woundThreshold',
  DeathRating = 'deathRating',
}

export type HealthStatMods = ReadonlyMap<HealthStat, number>;

export const mentalHealthStats = {
  [HealthStat.Derived]: 'derived',
  [HealthStat.Durability]: 'lucidity',
  [HealthStat.WoundsIgnored]: 'traumasIgnored',
  [HealthStat.WoundModifier]: 'traumaModifier',
  [HealthStat.WoundThreshold]: 'traumaThreshold',
  [HealthStat.DeathRating]: 'insanityRating',
} as const;

export type HealthMain = {
  damage: HealthProp<LangEntry>;
  durability: HealthProp<Abbreviation>;
  deathRating?: HealthProp<Abbreviation>;
};

export type HealthWounds = {
  wounds: HealthProp<LangEntry>;
  woundThreshold: HealthProp<Abbreviation>;
  woundModifier: HealthProp<LangEntry>;
  woundsIgnored: HealthProp<Abbreviation>;
};

// export type CommonHealth = {
//   readonly main: HealthMain;
//   readonly wound?: HealthWounds;
//   readonly type: HealthType;
//   readonly subtype?: PhysicalHealthSubtype;
//   readonly source: string;
//   readonly icon: string;
//   readonly woundIcon: string;
//   applyMutation(mutation: HealthModification): void
// };

export const formatDamageType = (type: HealthType) => {
  switch (type) {
    case HealthType.Mental:
      return localize('SHORT', 'stressValue');
    case HealthType.Mesh:
      return `${localize('mesh')} ${localize('SHORT', 'damageValue')}`;

    case HealthType.Physical:
      return `${localize('SHORT', 'damageValue')}`;
  }
};

export const healthLabels = (healthType: HealthType, stat: HealthStat) =>
  localize(healthType === HealthType.Mental ? mentalHealthStats[stat] : stat);

// export const healthDiff = <T extends CommonHealth>(
//   originalHealth: T,
//   newHealth: T
// ) => ({
//   damage: newHealth.main.damage.value - originalHealth.main.damage.value,
//   wounds:
//     (newHealth.wound?.wounds.value || 0) -
//     (originalHealth.wound?.wounds.value || 0),
//   damageLabel: originalHealth.main.damage.label,
//   woundLabel: originalHealth.wound?.wounds.label,
// });
