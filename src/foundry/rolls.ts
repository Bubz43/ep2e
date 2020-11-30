export type RollData = ReturnType<Roll['toJSON']>;

export type RollInfo = {
  label: string;
  formula: string;
  result: number;
  roll?: RollData;
};

export type LabeledFormula = { label: string; formula: string };

export type RolledFormula = { label: string; roll: RollData };

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

export const rollLimit = (formula: string, limit: 'max' | 'min') => {
  const rolled = preRolled[limit];
  const existing = rolled.get(formula);
  if (typeof existing === 'number') return existing;
  const val = new Roll(formula || '0').evaluate({
    maximize: limit === 'max',
    minimize: limit === 'min',
  }).total;
  rolled.set(formula, val);
  return val;
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
    roll = new Roll(formula, data).roll();
  } catch (err) {
    console.log(err);
  }
  return roll;
};

const cleanedFormulas = new Map<string, string>();

export const cleanFormula = (formula: string) => {
  let cleaned = cleanedFormulas.get(formula);
  if (!cleaned) {
    cleaned = new Roll(formula).formula;
    cleanedFormulas.set(formula, cleaned || formula);
  }
  return cleaned as string;
};
