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

export const rollLabeledFormulas = (
  formulas: LabeledFormula[],
): RolledFormula[] => {
  return formulas.flatMap(({ formula, label }) => {
    const roll = rollFormula(formula)?.toJSON();
    return roll ? { roll, label } : [];
  });
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

export const rollLimit = (formula: string, limit: 'max' | 'min') => {
  const rolled = preRolled[limit];
  const existing = rolled.get(formula);
  if (typeof existing === 'number') return existing;
  const roll = new Roll(formula || '0').evaluate({
    maximize: limit === 'max',
    minimize: limit === 'min',
    async: false,
  });
  const total = (roll as Roll).total as number;
  rolled.set(formula, total);
  return total;
};

export const averageRoll = (formula: string) => {
  return Math.round(
    (rollLimit(formula, 'max') + rollLimit(formula, 'min')) / 2,
  );
};

export const rollFormula = (
  formula: string,
  data: Record<string, number> = {},
) => {
  let roll: Roll | null = null;
  try {
    roll = new Roll(formula, data).evaluate({ async: false }) as Roll;
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
