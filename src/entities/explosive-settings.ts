import { Demolition, ExplosiveTrigger } from '@src/data-enums';
import type { PlacedTemplateIDs } from '@src/foundry/canvas';
import { SuccessTestResult } from '@src/success-test/success-test';

export type ExplosiveSettings = {
  placing?: boolean;
  template?: PlacedTemplateIDs | null;
  trigger: ExplosiveTrigger;
  timerDuration?: number;
  duration?: number;
  attackType?: 'primary' | 'secondary';
  centeredReduction?: number;
  uniformBlastRadius?: number;
  demolition?: DemolitionSetting | null;
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

export const createDemolitionSetting = (type: Demolition): DemolitionSetting => {
  switch (type) {
    case Demolition.DamageAgainsStructures:
      return {
        type,
        testResult: SuccessTestResult.Success,
      }
  
    case Demolition.DisarmDifficulty:
      return {
        type,
        roll: 50,
        testResult: SuccessTestResult.Success
      }
    
    case Demolition.ShapeCentered:
      return {
        type,
        angle: 180
      }
    
    case Demolition.StructuralWeakpoint:
      return { type }
  }
}