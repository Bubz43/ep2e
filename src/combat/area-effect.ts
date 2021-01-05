import type { AreaEffectType } from '@src/data-enums';
import { nonNegative } from '@src/utility/helpers';
import { clamp } from 'remeda';

type UniformAreaEffect = {
  type: AreaEffectType.Uniform;
  radius: number;
};

type CenteredAreaEffect = {
  type: AreaEffectType.Centered;
  dvReduction?: number;
  angle?: number;
};

type ConeAreaEffect = {
  type: AreaEffectType.Cone;
  range: number;
};

export type AreaEffect =
  | UniformAreaEffect
  | CenteredAreaEffect
  | ConeAreaEffect;

export const getCenteredDistance = (damage: number, falloff: number) => {
  return clamp(nonNegative(damage) / Math.abs(falloff), { min: 1 });
};
