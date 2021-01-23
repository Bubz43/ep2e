import type { AttackType } from '@src/combat/attacks';
import { CalledShot, Demolition, ExplosiveTrigger } from '@src/data-enums';
import { CommonInterval, currentWorldTimeMS } from '@src/features/time';
import type { PlacedTemplateIDs } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { SuccessTestResult } from '@src/success-test/success-test';
import { compact } from 'remeda';
import type { ActorType } from './entity-types';

export type ExplosiveSettings = {
  placing?: boolean;
  templateIDs?: PlacedTemplateIDs | null;
  trigger: ExplosiveTriggerSettings;
  duration?: number;
  attackType?: AttackType;
  centeredReduction?: number;
  uniformBlastRadius?: number;
  demolition?: DemolitionSetting | null;
};

type Trigger<T extends { type: ExplosiveTrigger }> = T;

type AirburstTrigger = Trigger<{
  type: ExplosiveTrigger.Airburst;
  distance: number;
}>;

type ImpactTrigger = Trigger<{
  type: ExplosiveTrigger.Impact;
}>;

type SignalTrigger = Trigger<{
  type: ExplosiveTrigger.Signal;
}>;

export type ProximityTrigger = Trigger<{
  type: ExplosiveTrigger.Proximity;
  radius: number;
  startTime?: number | null;
  targets: ActorType.Biological | ActorType.Synthetic | '';
}>;

export type TimerTrigger = Trigger<{
  type: ExplosiveTrigger.Timer;
  detonationPeriod: number;
  startTime: number;
}>;

export type ExplosiveTriggerSettings =
  | AirburstTrigger
  | ImpactTrigger
  | ProximityTrigger
  | SignalTrigger
  | TimerTrigger;

export const createExplosiveTriggerSetting = (
  type: ExplosiveTrigger,
): ExplosiveTriggerSettings => {
  switch (type) {
    case ExplosiveTrigger.Airburst:
      return {
        type,
        distance: 1,
      };

    case ExplosiveTrigger.Impact:
    case ExplosiveTrigger.Signal:
      return { type };

    case ExplosiveTrigger.Proximity:
      return { type, radius: 3, targets: '' };

    case ExplosiveTrigger.Timer:
      return {
        type,
        detonationPeriod: CommonInterval.Turn,
        startTime: currentWorldTimeMS(),
      };
  }
};

type Demo<T extends { type: Demolition }> = T;

type IncreasedDemolitionDamage = Demo<{
  type: Demolition.DamageAgainsStructures;
  testResult: SuccessTestResult;
}>;

type ShapedDemolition = Demo<{
  type: Demolition.ShapeCentered;
  angle: number;
}>;

type WeakpointDemolition = Demo<{
  type: Demolition.StructuralWeakpoint;
}>;

type DisarmDemolition = Demo<{
  type: Demolition.DisarmDifficulty;
  roll: number;
  testResult: SuccessTestResult;
}>;

export type DemolitionSetting =
  | IncreasedDemolitionDamage
  | ShapedDemolition
  | WeakpointDemolition
  | DisarmDemolition;

export const createDemolitionSetting = (
  type: Demolition,
): DemolitionSetting => {
  switch (type) {
    case Demolition.DamageAgainsStructures:
      return {
        type,
        testResult: SuccessTestResult.Success,
      };

    case Demolition.DisarmDifficulty:
      return {
        type,
        roll: 50,
        testResult: SuccessTestResult.Success,
      };

    case Demolition.ShapeCentered:
      return {
        type,
        angle: 180,
      };

    case Demolition.StructuralWeakpoint:
      return { type };
  }
};

export enum AggressiveOption {
  Modifier = "modifier",
  Damage = "dv"
}

export type MeleeWeaponSettings = {
  attackType?: AttackType;
  unarmedDV?: string;
  touchOnly?: boolean;
  aggressive?: AggressiveOption | null;
  charging?: boolean;
  extraWeapon?: boolean;
  calledShot?: CalledShot | null;
  oneHanded?: boolean;
};

export const formulasFromMeleeSettings = ({ aggressive, charging, extraWeapon }: MeleeWeaponSettings) => {
  return compact([
    aggressive === AggressiveOption.Damage && {
      label: localize('aggressive'),
      formula: '+1d10',
    },
    charging && { label: localize('charging'), formula: '+1d6' },
    extraWeapon && {
      label: localize('extraWeapon'),
      formula: '+1d6',
    },
  ]);
}