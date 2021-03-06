import type { ArmorType } from '@src/features/active-armor';
import { createFeature } from '@src/features/feature-helpers';
import { currentWorldTimeMS } from '@src/features/time';
import { HealthType } from '@src/health/health';
import type { StressType } from '@src/health/mental-health';

export const rollMultipliers = [0.5, 1, 2, 3] as const;

export type RollMultiplier = typeof rollMultipliers[number];

type Base = {
  reduceAVbyDV: boolean;
  armorPiercing: boolean;
  multiplier: RollMultiplier;
  armorUsed: ArmorType[];
  additionalArmor: number;
  source: string;
  kind: 'damage';
};

type CommonDamage<T extends { type: HealthType }> = Base &
  T & { damageValue: number; formula: string };

export type StressDamage = CommonDamage<{
  stressType: StressType | '';
  type: HealthType.Mental;
}>;

export type PhysicalDamage = CommonDamage<{
  type: HealthType.Physical;
  cumulativeDotID: string;
}>;

export type MeshDamage = CommonDamage<{
  type: HealthType.Mesh;
}>;

export type Damage = StressDamage | PhysicalDamage | MeshDamage;

export type Heal = {
  type: HealthType;
  damage: number;
  wounds: number;
  source: string;
  kind: 'heal';
  multiplier: RollMultiplier;
};

export const createHeal = createFeature<Heal, 'type'>(() => ({
  damage: 0,
  wounds: 0,
  source: '',
  kind: 'heal',
  multiplier: 1,
}));

export type DamageOverTime = {
  formula: string;
  armorPiercing: boolean;
  reduceAVbyDV: boolean;
  armorUsed: ArmorType[];
  source: string;
  duration: number;
  startTime: number;
  multiplier: RollMultiplier;
};

export const createDamageOverTime = createFeature<
  DamageOverTime,
  'formula' | 'source' | 'duration'
>(() => ({
  armorPiercing: false,
  reduceAVbyDV: false,
  armorUsed: [],
  startTime: currentWorldTimeMS(),
  multiplier: 1,
}));

export type ArmorDamage = Record<ArmorType, number> & {
  source: string;
};

type RequiredFields = 'formula' | 'damageValue';

const common: Base = {
  multiplier: 1,
  armorPiercing: false,
  reduceAVbyDV: false,
  armorUsed: [],
  additionalArmor: 0,
  kind: 'damage',
  source: '',
};

export const createStressDamage = createFeature<StressDamage, RequiredFields>(
  () => ({
    ...common,
    stressType: '',
    type: HealthType.Mental,
  }),
);

export const createPhysicalDamage = createFeature<
  PhysicalDamage,
  RequiredFields
>(() => ({
  ...common,
  type: HealthType.Physical,
  cumulativeDotID: '',
}));

export const createMeshDamage = createFeature<MeshDamage, RequiredFields>(
  () => ({
    ...common,
    type: HealthType.Mesh,
  }),
);
