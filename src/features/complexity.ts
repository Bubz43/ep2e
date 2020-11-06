import { Complexity } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { compact } from 'remeda';
import { CommonInterval } from './time';
import { toMilliseconds } from "./modify-milliseconds";

export const complexityGP = {
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
  return compact([
    localize('SHORT', complexity),
    restricted ? localize('restricted')[0] : '',
    complexityGP[complexity],
  ]).join(' / ');
};

export const acquisitionTime: Record<Complexity, number> = {
  [Complexity.Minor]: toMilliseconds({ hours: 2 }),
  [Complexity.Moderate]: toMilliseconds({ hours: 8 }),
  [Complexity.Major]: CommonInterval.Day,
  [Complexity.Rare]: CommonInterval.Day,
};
