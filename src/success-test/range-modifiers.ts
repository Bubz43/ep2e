import { RangeRating } from '@src/data-enums';

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
