import { AreaEffectType } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { cleanFormula, LabeledFormula } from '@src/foundry/rolls';
import { notEmpty } from '@src/utility/helpers';
import { compact, map, pipe } from 'remeda';
import type { UsedAttackArmor } from './attacks';

export const formatArmorUsed = ({
  armorPiercing,
  reduceAVbyDV,
  armorUsed,
}: Partial<UsedAttackArmor>) => {
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

export const formatAreaEffect = (
  {
    areaEffect,
    areaEffectRadius,
  }: { areaEffect: '' | AreaEffectType; areaEffectRadius: number },
  fallback = '-',
) => {
  return areaEffect
    ? `${localize(areaEffect)}${
        areaEffectRadius
          ? areaEffect !== AreaEffectType.Centered
            ? ` (${areaEffectRadius} m)`
            : ` (–2 DV/m)`
          : ''
      }`
    : fallback;
};
