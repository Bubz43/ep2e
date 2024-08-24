import { localize } from '@src/foundry/localization';
import { identity, map } from 'remeda';
import { createFeature } from './feature-helpers';
import { CommonPilotField, FieldSkillType, SkillType } from './skills';

export enum Movement {
  Boat = 'boat',
  Hopper = 'hopper',
  Hover = 'hover',
  Ionic = 'ionic',
  Microlight = 'microlight',
  Roller = 'roller',
  Rotor = 'rotor',
  Snake = 'snake',
  Submarine = 'submarine',
  Swimmer = 'swimmer',
  ThrustVector = 'thrustVector',
  Tracked = 'tracked',
  Walker = 'walker',
  Wheeled = 'wheeled',
  Winged = 'winged',
  Brachiate = "brachiate",
  Glider = 'glider',
  PlasmaSail = "plasmaSail",
  MagneticGenerator = "magneticGenerator",
}

export enum MovementRange {
  VerySlow = 'verySlow',
  Slow = 'slow',
  Medium = 'medium',
  Fast = 'fast',
  VeryFast = 'veryFast',
}

export const movementRangeSpeeds = {
  [MovementRange.VerySlow]: { base: 2, full: 8 },
  [MovementRange.Slow]: { base: 4, full: 12 },
  [MovementRange.Medium]: { base: 4, full: 20 },
  [MovementRange.Fast]: { base: 8, full: 32 },
  [MovementRange.VeryFast]: { base: 8, full: 40 },
} as const;

export const getMovementSkill = (movement: Movement) => {
  const piloted = pilotMovementTypes.get(movement);
  return piloted
    ? `${localize(FieldSkillType.Pilot)}: ${localize(piloted)}`
    : map([SkillType.Athletics, SkillType.FreeFall], localize).join(' | ');
};

export const pilotMovementTypes: ReadonlyMap<
  Movement,
  CommonPilotField
> = new Map([
  [Movement.Boat, CommonPilotField.Nautical],
  [Movement.Hover, CommonPilotField.Ground],
  [Movement.Ionic, CommonPilotField.Air],
  [Movement.Microlight, CommonPilotField.Air],
  [Movement.Rotor, CommonPilotField.Air],
  [Movement.Submarine, CommonPilotField.Nautical],
  [Movement.ThrustVector, CommonPilotField.Air],
  [Movement.Tracked, CommonPilotField.Ground],
  [Movement.Wheeled, CommonPilotField.Ground],
]);

export type MovementRate = {
  type: Movement;
  base: number;
  full: number;
  // TODO: Skill
  // range: MovementRange;
};

export const createMovementRate = createFeature<
  MovementRate,
  keyof MovementRate
>(identity);

export const defaultMovement = createMovementRate({
  type: Movement.Walker,
  base: 4,
  full: 20,
});
