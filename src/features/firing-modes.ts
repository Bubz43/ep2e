export enum FiringMode {
  SingleShot = 'singleShot',
  SemiAutomatic = 'semiAuto',
  BurstFire = 'burstFire',
  FullAuto = 'fullAuto',
}

export enum MultiAmmoOption {
  ConcentratedToHit = 'concentratedToHit',
  ConcentratedDamage = 'concentratedDamage',
  AdjacentTargets = 'adjacentTargets',
}

export type FullAutoOption = MultiAmmoOption | 'suppressiveFire';

export const multiAmmoValues = {
  [FiringMode.BurstFire]: {
    [MultiAmmoOption.ConcentratedDamage]: '+1d10',
    [MultiAmmoOption.AdjacentTargets]: 2,
    [MultiAmmoOption.ConcentratedToHit]: 10,
  },
  [FiringMode.FullAuto]: {
    [MultiAmmoOption.ConcentratedDamage]: '+2d10',
    [MultiAmmoOption.AdjacentTargets]: 3,
    [MultiAmmoOption.ConcentratedToHit]: 30,
  },
} as const;

export type MultiAmmoFiringMode = keyof typeof multiAmmoValues;

export const firingModeCost = {
  [FiringMode.SingleShot]: 1,
  [FiringMode.SemiAutomatic]: 1,
  [FiringMode.BurstFire]: 3,
  [FiringMode.FullAuto]: 10,
  suppressiveFire: 20,
} as const;

export type FiringModeGroup =
  | [FiringMode.SingleShot | FiringMode.SemiAutomatic]
  | [FiringMode.BurstFire, MultiAmmoOption]
  | [FiringMode.FullAuto, FullAutoOption];

export const createFiringModeGroup = (
  firingMode: FiringMode,
): FiringModeGroup => {
  switch (firingMode) {
    case FiringMode.SemiAutomatic:
    case FiringMode.SingleShot:
      return [firingMode];

    case FiringMode.BurstFire:
    case FiringMode.FullAuto:
      return [firingMode, MultiAmmoOption.ConcentratedToHit];
  }
};

export const hasFiringModeOptions = (
  mode: FiringMode,
): mode is MultiAmmoFiringMode => mode in multiAmmoValues;

export const getFiringModeGroupShots = (group: FiringModeGroup) => {
  if (group[0] === FiringMode.FullAuto && group[1] === 'suppressiveFire')
    return firingModeCost.suppressiveFire;
  return firingModeCost[group[0]];
};

export const canAim = ([firingMode]: FiringModeGroup) => {
  return (
    firingMode === FiringMode.SingleShot ||
    firingMode === FiringMode.SemiAutomatic
  );
};
