import type { Demolition, ExplosiveTrigger } from '@src/data-enums';
import type { PlacedTemplateIDs } from '@src/foundry/canvas';
import type { SuccessTestResult } from '@src/success-test/success-test';

export type ExplosiveSettings = {
  placing?: boolean;
  template?: PlacedTemplateIDs | null;
  trigger: ExplosiveTrigger;
  timerDuration?: number;
  duration?: number;
  attackType?: 'primary' | 'secondary';
  centeredReduction?: number;
  uniformBlastRadius?: number;
  demolition: DemolitionSetting;
};

type DemoSetting<T extends { type: Demolition }> = T;

export type IncreasedDemolitionDamage = DemoSetting<{
  type: Demolition.DamageAgainsStructures;
  testResult: SuccessTestResult;
}>;

export type ShapedDemolition = DemoSetting<{
  type: Demolition.ShapeCentered;
  angle: number;
}>;

export type WeakpointDemolition = DemoSetting<{
  type: Demolition.StructuralWeakpoint;
}>;

export type DisarmDemolition = DemoSetting<{
  type: Demolition.DisarmDifficulty;
  roll: number;
  testResult: SuccessTestResult;
}>;

export type DemolitionSetting =
  | IncreasedDemolitionDamage
  | ShapedDemolition
  | WeakpointDemolition
  | DisarmDemolition;
