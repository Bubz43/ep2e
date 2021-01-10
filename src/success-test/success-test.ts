import { capitalize } from '@src/foundry/misc-helpers';
import { createPipe } from 'remeda';

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
}

// export type SuccessResult =
//   | SuccessTestResult.Success
//   | SuccessTestResult.SuperiorSuccess
//   | SuccessTestResult.SuperiorSuccessX2
//   | SuccessTestResult.CriticalSuccess;
