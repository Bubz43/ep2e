import { prop } from 'remeda';

export type RollData = ReturnType<Roll['toJSON']>;

export type RollInfo = {
  label: string;
  formula: string;
  result: number;
  roll?: RollData;
};

export type LabeledFormula = { label: string; formula: string };

export type RolledFormula = { label: string; roll: RollData };

export const joinLabeledFormulas = (formulas: LabeledFormula[]) =>
  cleanFormula(formulas.map(prop('formula')).join(' + '));

export const rollLabeledFormulas = async (
  formulas: LabeledFormula[],
): Promise<RolledFormula[]> => {
  const rolled: RolledFormula[] = [];
  for (const {formula, label} of formulas) {
    const roll = await rollFormula(formula);
    if (roll) {
      rolled.push({ roll: roll.toJSON(), label });
    }
  }
  return rolled
};

const preRolled = {
  max: new Map<string, number>(),
  min: new Map<string, number>(),
};

export const isValidFormula = (formula: unknown): formula is string => {
  try {
    Roll.validate(formula);
    return true;
  } catch (error) {
    return false;
  }
};

export const rollLimit = async (formula: string, limit: 'max' | 'min') => {
  const rolled = preRolled[limit];
  const existing = rolled.get(formula);
  if (typeof existing === 'number') return existing;
  const roll = await new Roll(formula || '0').evaluate({
    maximize: limit === 'max',
    minimize: limit === 'min',
  });
  const total = (roll ).total as number;
  rolled.set(formula, total);
  return total;
};

export const averageRoll = async  (formula: string) => {
  return Math.round(
    (await rollLimit(formula, 'max') + await rollLimit(formula, 'min')) / 2,
  );
};

export const rollFormula = async  (
  formula: string,
  data: Record<string, number> = {},
) => {
  let roll: Roll | null = null;
  try {
    roll = await (new Roll(formula, data).evaluate() );
  } catch (err) {
    // console.log(err);
  }
  return roll;
};

const cleanedFormulas = new Map<string, string>();

export const cleanFormula = (formula: string) => {
  let cleaned = cleanedFormulas.get(formula);
  if (!cleaned) {
    cleaned = new Roll(formula).formula;
    if (cleaned) {
      cleaned = cleaned.replaceAll(/\+\s*\+/g, '+').replaceAll(/\+\s*\-/g, '-');
    }
    cleanedFormulas.set(formula, cleaned || formula);
  }
  return cleaned as string;
};
