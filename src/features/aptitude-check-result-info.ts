import { AptitudeType, AttackTrait } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { compact } from 'remeda';
import { ArmorType } from './active-armor';
import { CommonInterval, prettyMilliseconds, TimeInterval } from './time';
import { ConditionType } from './conditions';
import { withSign } from '@src/utility/helpers';

export type CheckResultInfo = {
  condition?: ConditionType | '';
  impairment?: number;
  stress?: string;
  notes?: string;

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
  } = info;

  const isStatic = !!staticDuration || !variableDuration;

  return {
    condition,
    impairment,
    stress,
    notes,
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

  return `${effect || '??'} ${localize(
    'for',
  ).toLocaleLowerCase()} ${duration} ${
    additionalDurationPerSuperior
      ? `(${`+${prettyMilliseconds(additionalDurationPerSuperior)} ${localize(
          'per',
        ).toLocaleLowerCase()} ${localize('superiorFailure')}`})`
      : ''
  }`;
};
const checkInfoFromAttackTrait = (trait: AttackTrait): AptitudeCheckInfo => {
  switch (trait) {
    case AttackTrait.Blinding:
      return {
        check: AptitudeType.Reflexes,
        checkModifier: 0,
        armorAsModifier: '',
        checkSuccess: [],
        checkFailure: [
          {
            condition: ConditionType.Blinded,
            staticDuration: CommonInterval.Turn,
            additionalDurationPerSuperior: CommonInterval.Turn,
          },
        ],
        criticalCheckFailure: [
          {
            condition: ConditionType.Blinded,
            staticDuration: CommonInterval.Indefinite,
          },
        ],
      };

    case AttackTrait.Entangling:
      return {
        check: AptitudeType.Reflexes,
        checkModifier: 0,
        armorAsModifier: '',
        checkSuccess: [],
        checkFailure: [
          {
            condition: ConditionType.Grappled,
            staticDuration: CommonInterval.Instant,
          },
        ],
        criticalCheckFailure: [],
      };

    case AttackTrait.Knockdown:
      return {
        check: AptitudeType.Somatics,
        checkModifier: 0,
        armorAsModifier: '',
        checkSuccess: [],
        checkFailure: [
          {
            condition: ConditionType.Prone,
            staticDuration: CommonInterval.Instant,
          },
        ],
        criticalCheckFailure: [],
      };

    case AttackTrait.Pain:
      return {
        check: AptitudeType.Willpower,
        checkModifier: 0,
        armorAsModifier: '',
        checkFailure: [
          {
            staticDuration: CommonInterval.Turn,
            impairment: -20,
          },
        ],
        checkSuccess: [],
        criticalCheckFailure: [],
      };

    case AttackTrait.Shock:
      return {
        check: AptitudeType.Somatics,
        checkModifier: 0,
        armorAsModifier: ArmorType.Energy,
        checkSuccess: [
          {
            condition: ConditionType.Stunned,
            staticDuration: CommonInterval.Turn * 3,
          },
        ],
        checkFailure: [
          {
            condition: ConditionType.Incapacitated,
            staticDuration: CommonInterval.Turn,
            additionalDurationPerSuperior: CommonInterval.Turn * 2,
          },
          {
            condition: ConditionType.Prone,
            staticDuration: CommonInterval.Instant,
          },
          {
            condition: ConditionType.Stunned,
            staticDuration: CommonInterval.Minute * 3,
          },
        ],
        criticalCheckFailure: [],
      };

    case AttackTrait.Stun:
      return {
        check: AptitudeType.Somatics,
        checkModifier: 0,
        armorAsModifier: ArmorType.Kinetic,
        checkSuccess: [],
        checkFailure: [
          {
            condition: ConditionType.Stunned,
            staticDuration: CommonInterval.Turn,
            additionalDurationPerSuperior: CommonInterval.Turn,
          },
        ],
        criticalCheckFailure: [
          {
            condition: ConditionType.Incapacitated,
            staticDuration: CommonInterval.Turn,
          },
          {
            condition: ConditionType.Stunned,
            staticDuration: CommonInterval.Minute,
          },
        ],
      };
  }
};
