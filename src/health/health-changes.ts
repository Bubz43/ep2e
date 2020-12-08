import { enumValues } from '@src/data-enums';
import type { ArmorType } from '@src/features/active-armor';
import { createFeature } from '@src/features/feature-helpers';
import { HealthType } from '@src/health/health';
import { StressType } from '@src/health/mental-health';
import { mapToObj } from 'remeda';

type Base = {
  reduceAVbyDV: boolean;
  armorPiercing: boolean;
  multiplier: 0.5 | 1 | 2;
  armorUsed: ArmorType[];
  source: string;
  kind: 'damage';
};

type CommonDamage<T extends { type: HealthType }> = Base &
  T & { damageValue: number; formula: string };

export type StressDamage = CommonDamage<{
  stressType: StressType;
  type: HealthType.Mental;
}>;

export type PhysicalDamage = CommonDamage<{
  type: HealthType.Physical;
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
};

export type DamageOverTime = {
  formula: string;
  armorPiercing: boolean;
  armorRemoving: boolean;
  armorUsed: ArmorType[];
  source: string;
  duration: number;
  startTime: number;
};

export type ArmorDamage = Record<ArmorType, number> & {
  source: string;
};


type RequiredFields = 'formula' | 'damageValue';

const common: Base = {
  multiplier: 1,
  armorPiercing: false,
  reduceAVbyDV: false,
  armorUsed: [],
  kind: 'damage',
  source: '',
};

export const createStressDamage = createFeature<StressDamage, RequiredFields>(
  () => ({
    ...common,
    stressType: StressType.TheUnknown,
    type: HealthType.Mental,
  }),
);

export const createPhysicalDamage = createFeature<
  PhysicalDamage,
  RequiredFields
>(() => ({
  ...common,
  type: HealthType.Physical,
}));

export const createMeshDamage = createFeature<MeshDamage, RequiredFields>(
  () => ({
    ...common,
    type: HealthType.Mesh,
  }),
);
