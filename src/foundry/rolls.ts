export type RollData = ReturnType<Roll["toJSON"]>;

export type RollInfo = {
  label: string;
  formula: string;
  result: number;
  roll?: RollData;
};

export const setupRollInfo = (
  unrolled: Pick<RollInfo, "label" | "formula">[]
) => {
  return unrolled.map((part) => {
    const { total = 0, roll: rollInstance } = rollFormula(part.formula);
    return {
      ...part,
      result: total,
      roll: rollInstance ? rollInstance.toJSON() : undefined,
    };
  });
};

export const rollInfoTotal = (rolls: RollInfo[]) => {
  const fullFormula = cleanFormula(
    rolls.map(({ formula }) => formula).join("+")
  );
  return {
    fullFormula,
    total: rolls.reduce((accum, { result }) => accum + result, 0),
  };
};

const preRolled = {
  max: new Map<string, number>(),
  min: new Map<string, number>(),
};

export const rollLimit = (formula: string, limit: "max" | "min") => {
  const rolled = preRolled[limit];
  const existing = rolled.get(formula);
  if (typeof existing === "number") return existing;
  const val = new Roll(formula || "0").evaluate({
    maximize: limit === "max",
    minimize: limit === "min",
  }).total;
  rolled.set(formula, val);
  return val;
};

export const averageRoll = (formula: string) => {
  return Math.round(
    (rollLimit(formula, "max") + rollLimit(formula, "min")) / 2
  );
};

export const rollFormula = (
  formula: string,
  data: Record<string, number> = {}
) => {
  try {
    const roll = new Roll(formula, data).roll();
    return {
      roll,
      total: Number(roll.total),
    };
  } catch (err) {
    console.log(err);
  }
  return {};
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
