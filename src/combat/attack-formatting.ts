import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { compact, map, pipe } from 'remeda';
import type { UsedAttackArmor } from './attacks';

export const formatArmorUsed = ({
  armorPiercing,
  reduceAVbyDV,
  armorUsed,
}: UsedAttackArmor) => {
  return notEmpty(armorUsed)
    ? pipe(
        [
          ...armorUsed,
          armorPiercing && 'armorPiercing',
          reduceAVbyDV && 'reduceAVbyDV',
        ] as const,
        compact,
        map(localize),
      ).join(', ')
    : localize('ignoresArmor');
};
