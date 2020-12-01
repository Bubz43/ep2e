import { createFeature } from '@src/features/feature-helpers';
import type { StressType } from '@src/health/mental-health';

export type StressDamage = {
  formula: string;
  value: number;
  armorPiercing: boolean;
  stressType: StressType;
  multiplier: 0.5 | 1 | 2;
};

export const createStressDamage = createFeature<
  StressDamage,
  'formula' | 'value' | "stressType"
>(() => ({
  armorPiercing: false,
  multiplier: 1
}));
