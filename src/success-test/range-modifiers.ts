import { PsiRange, RangeRating } from '@src/data-enums';
import { ItemType } from '@src/entities/entity-types';
import type { RangedWeapon } from '@src/entities/item/item';
import { getCurrentEnvironment } from '@src/features/environment';

export const getRangeModifier = (range: number, targetDistance: number) => {
  if (targetDistance <= 2)
    return {
      rating: RangeRating.PointBlank,
      modifier: 10,
    };

  if (targetDistance <= 10)
    return {
      rating: RangeRating.Close,
      modifier: 0,
    };

  if (targetDistance <= range)
    return {
      rating: RangeRating.Range,
      modifier: -10,
    };

  return {
    rating: RangeRating.BeyondRange,
    modifier: Math.ceil(targetDistance / range) * -10,
  };
};

export const applyGravityToWeaponRange = (range: number, gravity: number) => {
  return !gravity ? Infinity : Math.round((range / gravity) * 10) / 10;
};

export const getWeaponRange = (weapon: RangedWeapon): number => {
  const { gravity, vacuum } = getCurrentEnvironment();
  if (weapon.type === ItemType.BeamWeapon) {
    return vacuum ? Infinity : weapon.range;
  }
  return applyGravityToWeaponRange(weapon.range, gravity);
};

export const psiRangeThresholds = (increases: number) => {
  const multiplier = increases + 1;
  return {
    [PsiRange.PointBlank]: 2 * multiplier,
    [PsiRange.Close]: 10 * multiplier,
  };
};
