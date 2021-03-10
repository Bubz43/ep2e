import { AptitudeType } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { withSign } from '@src/utility/helpers';
import { compact } from 'remeda';
import type { ArmorType } from './active-armor';
import type { ConditionType } from './conditions';
import { CommonInterval, prettyMilliseconds, TimeInterval } from './time';

export type CheckResultInfo = {
  condition?: ConditionType | '';
  impairment?: number;
  stress?: string;
  notes?: string;
  fallDown?: boolean;
  staticDuration?: number;
  variableDuration?: string;
  variableInterval?: Exclude<TimeInterval, 'seconds'> | 'turns';
  additionalDurationPerSuperior?: number;
};

export const checkResultInfoWithDefaults = (
  info: CheckResultInfo,
): Required<CheckResultInfo> => {
  const {
    condition = '',
    impairment = 0,
    staticDuration,
    variableDuration,
    variableInterval = 'turns',
    additionalDurationPerSuperior = 0,
    stress = '',
    notes = '',
    fallDown = false,
  } = info;

  const isStatic = !!staticDuration || !variableDuration;

  return {
    condition,
    impairment,
    stress,
    notes,
    fallDown,
    additionalDurationPerSuperior,
    staticDuration: isStatic ? staticDuration || CommonInterval.Turn : 0,
    variableDuration: isStatic ? '' : '1d6',
    variableInterval,
  };
};

export enum CheckResultState {
  CheckSuccess = 'checkSuccess',
  CheckFailure = 'checkFailure',
  CriticalFailure = 'criticalCheckFailure',
}

export type AptitudeCheckInfo = {
  check: AptitudeType | '';
  checkModifier: number;
  armorAsModifier: ArmorType | '';
  checkSuccess: CheckResultInfo[];
  checkFailure: CheckResultInfo[];
  criticalCheckFailure: CheckResultInfo[];
};

export const formatAptitudeCheckInfo = ({
  check,
  checkModifier,
  armorAsModifier,
}: AptitudeCheckInfo) => {
  return `${localize(check || AptitudeType.Willpower)} ${localize('check')} ${
    checkModifier ? withSign(checkModifier) : ''
  } ${
    armorAsModifier ? `+${localize(armorAsModifier)} ${localize('armor')}` : ''
  }`.trim();
};

export const formatCheckResultInfo = (entry: CheckResultInfo) => {
  const {
    condition,
    staticDuration,
    variableDuration,
    variableInterval,
    impairment,
    stress,
    notes,
    fallDown,
    additionalDurationPerSuperior,
  } = checkResultInfoWithDefaults(entry);

  const effect = compact([
    condition && localize(condition),
    impairment &&
      `${impairment} ${localize('impairmentModifier').toLocaleLowerCase()}`,
    stress && `${localize('SHORT', 'stressValue')} ${stress}`,
    notes,
  ]).join(` & `);

  const duration = staticDuration
    ? prettyMilliseconds(staticDuration, { compact: false })
    : `${variableDuration} ${localize(variableInterval).toLocaleLowerCase()}`;

  return `${fallDown ? `${localize('fallDown')}.` : ''} ${
    effect || '??'
  } ${localize('for').toLocaleLowerCase()} ${duration} ${
    additionalDurationPerSuperior
      ? `(${`+${prettyMilliseconds(additionalDurationPerSuperior)} ${localize(
          'per',
        ).toLocaleLowerCase()} ${localize('superiorFailure')}`})`
      : ''
  }`;
};
