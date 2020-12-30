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

enum SuccessTestResultTier {
  CriticalFailure,
  SuperiorFailureX2,
  SuperiorFailure,
  Failure,
  Success,
  SuperiorSuccess,
  SuperiorSuccessX2,
  CriticalSuccess,
}

const successTestResultRank = (result: SuccessTestResult) => {
  return SuccessTestResultTier[capitalize(result)];
};

export const isSuccessfullTestResult = createPipe(
  successTestResultRank,
  (rank) => rank >= SuccessTestResultTier.Success,
);
