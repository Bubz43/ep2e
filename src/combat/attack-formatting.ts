import { localize } from '@src/foundry/localization';
import { cleanFormula } from '@src/foundry/rolls';
import { notEmpty } from '@src/utility/helpers';
import { compact, map, pipe } from 'remeda';
import type { LabeledFormula, UsedAttackArmor } from './attacks';

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

export const formatLabeledFormulas = (formulas: LabeledFormula[]) =>
  cleanFormula(formulas.map(({ formula }) => formula).join('+'));
