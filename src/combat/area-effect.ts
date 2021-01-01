import type { AreaEffectType } from "@src/data-enums";

type UniformAreaEffect = {
  type: AreaEffectType.Uniform,
  radius: number;
}

type CenteredAreaEffect = {
  type: AreaEffectType.Centered,
  dvReduction?: number;
  angle?: number
}

type ConeAreaEffect = {
  type: AreaEffectType.Cone;
  range: number;
}

export type AreaEffect = UniformAreaEffect | CenteredAreaEffect | ConeAreaEffect