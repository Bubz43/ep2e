import { capitalize } from '@src/foundry/misc-helpers';
import { notEmpty } from '@src/utility/helpers';
import { clamp, createPipe, pipe, range, reverse } from 'remeda';

export enum SuccessTestResult {
  CriticalFailure = 'criticalFailure',
  SuperiorFailureX2 = 'superiorFailureX2',
  SuperiorFailure = 'superiorFailure',
  Failure = 'failure',
  Success = 'success',
  SuperiorSuccess = 'superiorSuccess',
  SuperiorSuccessX2 = 'superiorSuccessX2',
  CriticalSuccess = 'criticalSuccess',
}

enum ResultTier {
  CriticalFailure,
  SuperiorFailureX2,
  SuperiorFailure,
  Failure,
  Success,
  SuperiorSuccess,
  SuperiorSuccessX2,
  CriticalSuccess,
}

const getRank = (result: SuccessTestResult) => ResultTier[capitalize(result)];

export const isSuccessfullTestResult = createPipe(
  getRank,
  (rank) => rank >= ResultTier.Success,
);

export type SuccessTestModifier = {
  name: string;
  value: number;
  temporary?: boolean;
  icon?: string;
};

export class Percentile extends DiceTerm {
  faces = 10;
  declare results: ReturnType<DiceTerm['roll']>[];

  roll() {
    const roll = super.roll();
    roll.result -= 1;
    this.results[this.results.length - 1]!.result = roll.result;
    return roll;
  }

  get total() {
    if (!notEmpty(this.results)) this.roll();
    return this.results.reduce((accum, { result }) => accum + result, 0);
  }

  static get total() {
    const total = range(0, 2)
      .map(() => {
        const p = new Percentile();
        p.roll();
        return p.total;
      })
      .join('');
    return Number(total);
  }

  static DENOMINATION = 'p';
}

export const improveSuccessTestResult = (result: SuccessTestResult) => {
  switch (result) {
    case SuccessTestResult.SuperiorSuccess:
      return SuccessTestResult.SuperiorSuccessX2;

    case SuccessTestResult.Success:
      return SuccessTestResult.SuperiorSuccess;

    case SuccessTestResult.CriticalFailure:
      return SuccessTestResult.Failure;

    default:
      return result;
  }
};

export const flipFlopRoll = (roll: number) => {
  const stringRoll = String(roll);
  return Number(
    stringRoll.length === 1
      ? stringRoll + 0
      : [...stringRoll].reverse().join(''),
  );
};
const isCriticalRoll = (roll: number) => {
  const [a, b] = String(roll);
  return a === b;
};

export const successTestTargetClamp = clamp({ min: 0, max: 99 });

export const getSuccessTestResult = ({
  roll,
  target,
  defaulting = false,
}: {
  roll: number;
  target: number;
  defaulting?: boolean;
}) => {
  if (roll === 0 && !defaulting) return SuccessTestResult.CriticalSuccess;
  if (roll === 99) return SuccessTestResult.CriticalFailure;

  const isSuccess = roll <= target;
  const isCritical = isCriticalRoll(roll);

  switch (isSuccess) {
    case true:
      if (isCritical && !defaulting) return SuccessTestResult.CriticalSuccess;
      if (roll >= 66) return SuccessTestResult.SuperiorSuccessX2;
      if (roll >= 33) return SuccessTestResult.SuperiorSuccess;
      return SuccessTestResult.Success;

    case false:
      if (isCritical) return SuccessTestResult.CriticalFailure;
      if (roll <= 33) return SuccessTestResult.SuperiorFailureX2;
      if (roll <= 66) return SuccessTestResult.SuperiorFailure;
      return SuccessTestResult.Failure;
  }
};

export const rollSuccessTest = ({
  target,
  defaulting = false,
}: {
  target: number;
  defaulting?: boolean;
}) => {
  const { total: roll } = Percentile;
  const clampedTarget = successTestTargetClamp(target);
  return {
    roll,
    result: getSuccessTestResult({
      roll,
      target: clampedTarget,
      defaulting,
    }),
    target: clampedTarget,
    defaulting,
  };
};
