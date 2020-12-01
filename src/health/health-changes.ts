import type { ArmorType } from '@src/features/active-armor';
import { createFeature } from '@src/features/feature-helpers';
import { HealthType } from '@src/health/health';
import { StressType } from '@src/health/mental-health';

type CommonDamage<T extends { type: HealthType }> = {
  formula: string;
  damageValue: number;
  armorPiercing: boolean;
  multiplier: 0.5 | 1 | 2;
  armorUsed: ArmorType[];
  source: string;
  kind: 'damage';
} & T;

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

type RequiredFields = 'formula' | 'damageValue';

export const createStressDamage = createFeature<StressDamage, RequiredFields>(
  () => ({
    stressType: StressType.TheUnknown,
    armorPiercing: false,
    multiplier: 1,
    armorUsed: [],
    type: HealthType.Mental,
    source: '',
    kind: 'damage',
  }),
);

export const createPhysicalDamage = createFeature<
  PhysicalDamage,
  RequiredFields
>(() => ({
  armorPiercing: false,
  multiplier: 1,
  armorUsed: [],
  type: HealthType.Physical,
  source: '',
  kind: 'damage',
}));

export const createMeshDamage = createFeature<MeshDamage, RequiredFields>(
  () => ({
    armorPiercing: false,
    multiplier: 1,
    armorUsed: [],
    type: HealthType.Mesh,
    source: '',
    kind: 'damage',
  }),
);
