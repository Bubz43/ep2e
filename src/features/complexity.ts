import { Complexity } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { compact } from 'remeda';
import { CommonInterval } from './time';
import { toMilliseconds } from './modify-milliseconds';

export const complexityGP = {
  [Complexity.Trivial]: 0,
  [Complexity.Minor]: 1,
  [Complexity.Moderate]: 2,
  [Complexity.Major]: 3,
  [Complexity.Rare]: '5+',
};

export const formatComplexity = ({
  complexity,
  restricted,
}: {
  complexity: Complexity;
  restricted: boolean;
}) => {
  const base: (string | number)[] = compact([
    localize('SHORT', complexity),
    restricted ? localize('restricted')[0] : '',
  ]);
  base.push(complexityGP[complexity]);
  return base.join(' / ');
};

export const acquisitionTime: Record<Complexity, number> = {
  [Complexity.Trivial]: 0,
  [Complexity.Minor]: toMilliseconds({ hours: 2 }),
  [Complexity.Moderate]: toMilliseconds({ hours: 8 }),
  [Complexity.Major]: CommonInterval.Day,
  [Complexity.Rare]: CommonInterval.Day,
};
