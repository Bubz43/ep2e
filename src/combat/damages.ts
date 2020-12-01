import type { ArmorType } from '@src/features/active-armor';
import { createFeature } from '@src/features/feature-helpers';
import { HealthType } from '@src/health/health';
import { StressType } from '@src/health/mental-health';

type CommonDamage<T extends { type: HealthType }> = {
  formula: string;
  value: number;
  armorPiercing: boolean;
  multiplier: 0.5 | 1 | 2;
  armorUsed: ArmorType[];
} & T;

export type StressDamage = CommonDamage<{
  stressType: StressType;
  type: HealthType.Mental;
}>;

export type PhysicalDamage = CommonDamage<{
  type: HealthType.Physical
}>

export type MeshDamage = CommonDamage<{
  type: HealthType.Mesh
}>

export type Damage = StressDamage | PhysicalDamage | MeshDamage

export const createStressDamage = createFeature<
  StressDamage,
  'formula' | 'value'
  >(() => ({
  stressType: StressType.TheUnknown,
  armorPiercing: false,
  multiplier: 1,
  armorUsed: [],
  type: HealthType.Mental,
}));

export const createPhysicalDamage = createFeature<
  PhysicalDamage,
  'formula' | 'value'
>(() => ({
  armorPiercing: false,
  multiplier: 1,
  armorUsed: [],
  type: HealthType.Physical,
}));


export const createMeshDamage = createFeature<
  MeshDamage,
  'formula' | 'value'
>(() => ({
  armorPiercing: false,
  multiplier: 1,
  armorUsed: [],
  type: HealthType.Mesh,
}));


