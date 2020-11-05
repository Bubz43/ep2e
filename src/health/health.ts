import type { UpdateStore } from '@src/entities/update-store';
import {
  addFeature,
  createFeature,
  StringID,
} from '@src/features/feature-helpers';
import { worldTimeMS } from '@src/features/time';
import type { Abbreviation } from '@src/foundry/lang-schema';
import { LangEntry, localize } from '@src/foundry/localization';
import type { ValuedProp } from '@src/utility/field-values';
import { nonNegative } from '@src/utility/helpers';
import { pipe, clamp } from 'remeda';
import type { HealthRecoveries } from './recovery';

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
  log: StringID<HealthModification>[];
};

export enum HealthType {
  Mental = 'mental',
  Mesh = 'mesh',
  Physical = 'physical',
}

// export enum PhysicalHealthSubtype {
//   Bio = 'bio',
//   Synth = 'synth',
// }

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
  worldTime: number;
};

export const createHealthModification = createFeature<
  HealthModification,
  'mode' | 'damage' | 'wounds'
>(
  () => ({
    source: localize('unknown'),
    timestamp: Date.now(),
    worldTime: worldTimeMS(),
  }),
  ({ damage, wounds, ...data }) => ({
    damage: Math.abs(damage),
    wounds: Math.abs(wounds),
    ...data,
  }),
);

export const formatHealthModificationMode = (mode: HealthModificationMode) => {
  switch (mode) {
    case HealthModificationMode.Edit:
      return localize("setHealthTo")
    
    case HealthModificationMode.Heal:
      return localize("healed")
    
    case HealthModificationMode.Inflict:
      return localize("inflicted")
  }
}

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

export type HealthInit<T extends BasicHealthData> = {
  data: T;
  updater: UpdateStore<T>;
  source: string;
};

export type HealthWounds = {
  wounds: HealthProp<LangEntry>;
  woundThreshold: HealthProp<Abbreviation>;
  woundModifier: HealthProp<LangEntry>;
  woundsIgnored: HealthProp<Abbreviation>;
};

export interface CommonHealth<T extends BasicHealthData = BasicHealthData> {
  readonly main: HealthMain;
  readonly wound?: HealthWounds;
  readonly type: HealthType;
  readonly data: T;
  // readonly subtype?: PhysicalHealthSubtype;
  readonly source: string;
  readonly icon: string;
  readonly woundIcon: string;
  readonly recoveries?: HealthRecoveries;
  applyModification(modification: HealthModification): void | Promise<unknown>;
  resetLog(): void | Promise<unknown>
}

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

export const initializeHealthData = ({
  baseDurability,
  deathRatingMultiplier,
  statMods: mods,
  durabilitySplit,
}: {
  baseDurability: number;
  deathRatingMultiplier: 1.5 | 2;
  statMods?: HealthStatMods | null;
  durabilitySplit?: number;
}) => {
  const derivableDur = baseDurability + (mods?.get(HealthStat.Derived) || 0);
  const split = durabilitySplit || 1;
  const splitDur = Math.round(derivableDur / split);
  const durability = nonNegative(
    splitDur + Math.floor((mods?.get(HealthStat.Durability) || 0) / split),
  );

  return {
    durability,
    deathRating: pipe(
      splitDur * deathRatingMultiplier,
      (dr) => Math.ceil(dr) + (mods?.get(HealthStat.DeathRating) || 0),
      clamp({ min: durability }),
    ),
    woundThreshold: pipe(
      derivableDur / 5,
      (wt) => Math.ceil(wt) + (mods?.get(HealthStat.WoundThreshold) || 0),
      clamp({ min: 1 }),
    ),
    woundsIgnored: clamp(mods?.get(HealthStat.WoundsIgnored) || 0, {
      max: 3,
    }),
    woundModifier: -10 + (mods?.get(HealthStat.WoundModifier) || 0),
  };
};

export const applyHealthModification = (
  { log, damage: oldDamage, wounds: oldWounds }: BasicHealthData,
  modification: HealthModification,
) => {
  const { mode, damage, wounds } = modification;
  const updatedLog = addFeature(log, modification);
  switch (mode) {
    case HealthModificationMode.Edit:
      return {
        log: updatedLog,
        damage: nonNegative(damage),
        wounds: nonNegative(wounds),
      };

    case HealthModificationMode.Heal:
      return {
        log: updatedLog,
        damage: nonNegative(oldDamage - damage),
        wounds: nonNegative(oldWounds - wounds),
      };

    case HealthModificationMode.Inflict:
      return {
        log: updatedLog,
        damage: nonNegative(oldDamage + damage),
        wounds: nonNegative(oldWounds + wounds),
      };
  }
};

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
