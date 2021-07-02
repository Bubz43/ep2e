import { enumValues } from '@src/data-enums';
import type { AppliedEffects } from '@src/entities/applied-effects';
import {
  applyDurationMultipliers,
  HealthRecoveryEffect,
  Source,
  SourcedEffect,
} from '@src/features/effects';
import { createFeature } from '@src/features/feature-helpers';
import {
  prettyMilliseconds,
  currentWorldTimeMS,
  Timestamp,
  getElapsedTime,
  LiveTimeState,
  createLiveTimeState,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { averageRoll } from '@src/foundry/rolls';
import { nonNegative } from '@src/utility/helpers';
import { compact } from 'remeda';

export enum NaturalMentalHeal {
  Stress = 'stress',
  Trauma = 'trauma',
  Disorder = 'disorder',
}

export type NaturalMentalHealAttempt = {
  heal: NaturalMentalHeal;
} & Timestamp;

export const createMentalHealthAttempt = createFeature<
  NaturalMentalHealAttempt,
  'heal'
>(() => ({
  realTimeMS: Date.now(),
  worldTimeMS: currentWorldTimeMS(),
}));

export enum HealOverTimeTarget {
  Damage = 'damageRepair',
  Wound = 'woundRepair',
}

export enum RecoveryConditions {
  Normal = 'normal',
  Poor = 'poor',
  Harsh = 'harsh',
}

export type HealthTick = {
  amount: string;
  interval: number;
};

export type HealsOverTime = {
  ownHealTickStartTime: number;
  aidedHealTickStartTime: number;
  damageRepair: HealthTick;
  woundRepair: { amount: number; interval: number };
};
export type BasicTickInfo = Pick<HealthTick, 'amount' | 'interval'>;

export enum HealingSlot {
  OwnHealing = 'own',
  Aided = 'aided',
}

export type HealthRecovery = BasicTickInfo & {
  source: string;
  slot: HealingSlot;
  timeSinceTick: number;
};

export type Recoveries = {
  readonly recoveries: HealthRecoveries;
  readonly activeRegens: Record<HealOverTimeTarget, boolean>;
};

export const recoveryMultiplier = (condition: RecoveryConditions) => {
  switch (condition) {
    case RecoveryConditions.Harsh:
      return 3;
    case RecoveryConditions.Poor:
      return 2;
    case RecoveryConditions.Normal:
      return 1;
  }
};

export const recoveryConditionsLabel = (condition: RecoveryConditions) => {
  return `${localize(condition)} ${
    condition === RecoveryConditions.Normal
      ? ''
      : `x${recoveryMultiplier(condition)}`
  }`.trim();
};

export const formatAutoHealing = (
  { amount, interval }: { amount: string | number; interval: number },
  conditions = RecoveryConditions.Normal,
) => {
  return compact([
    amount || '-',
    localize('per').toLocaleLowerCase(),
    prettyMilliseconds(interval, {
      compact: true,
      approx: true,
    }),
    conditions !== RecoveryConditions.Normal
      ? `(${prettyMilliseconds(interval * recoveryMultiplier(conditions), {
          compact: true,
          approx: true,
        })})`
      : '',
  ]).join(' ');
};

export const tickRate = ({ amount, interval }: BasicTickInfo) =>
  averageRoll(amount) / interval;

export const healingSlotToProp = (slot: HealingSlot) =>
  slot === HealingSlot.Aided ? 'lastAidedTick' : 'lastUnaidedTick';

export type Recovery = HealthTick & {
  slot: HealingSlot;
  source: string;
  timeState: LiveTimeState;
};

export const setupRecoveries = ({
  hot,
  biological,
  effects,
  conditions,
  updateStartTime,
}: {
  hot: HealsOverTime;
  biological: boolean;
  effects: AppliedEffects['physicalHealthRecovery'];
  conditions: RecoveryConditions;
  updateStartTime: (
    update: Pick<
      Partial<HealsOverTime>,
      'aidedHealTickStartTime' | 'ownHealTickStartTime'
    >,
  ) => void;
}) => {
  const groups = {
    [HealOverTimeTarget.Damage]: new Map<HealingSlot, Recovery>(),
    [HealOverTimeTarget.Wound]: new Map<HealingSlot, Recovery>(),
    unused: new Map<HealOverTimeTarget, Recovery[]>(),
  } as const;

  const slot = biological ? HealingSlot.OwnHealing : HealingSlot.Aided;
  const multipliers = [
    recoveryMultiplier(conditions),
    ...effects.timeframeMultipliers,
  ];

  for (const stat of enumValues(HealOverTimeTarget)) {
    const group = groups[stat];
    const { amount, ...data } = hot[stat];
    if (amount && data.interval > 0) {
      const source = `${localize('own')} ${localize('healing')}`;
      const key = `${slot}HealTickStartTime` as const;
      group.set(slot, {
        ...data,
        amount: String(amount),
        slot,
        source,
        timeState: createLiveTimeState({
          duration: applyDurationMultipliers({
            duration: data.interval,
            multipliers,
          }),
          startTime: hot[key],
          label: source,
          id: `${stat}-${slot}`,
          updateStartTime: (newStartTime) =>
            updateStartTime({ [key]: newStartTime }),
        }),
      });
    }
  }

  for (const effect of effects.recovery) {
    const { stat, technologicallyAided, interval } = effect;
    const amount =
      stat === HealOverTimeTarget.Damage
        ? effect.damageAmount
        : String(effect.woundAmount);

    if (!amount || interval <= 0) continue;

    const group = groups[stat];
    const slot =
      technologicallyAided || !biological
        ? HealingSlot.Aided
        : HealingSlot.OwnHealing;
    const current = group.get(slot);
    if (current && tickRate(current) > tickRate({ amount, interval })) {
      const unused = groups.unused.get(stat);
      if (unused) unused.push(current);
      else groups.unused.set(stat, [current]);
    }
    const key = `${slot}HealTickStartTime` as const;
    group.set(slot, {
      amount,
      interval,
      slot,
      source: effect[Source],
      timeState: createLiveTimeState({
        duration: applyDurationMultipliers({
          duration: effect.interval,
          multipliers,
        }),
        startTime: hot[key],
        label: effect[Source],
        id: `${stat}-${slot}`,
        updateStartTime: (newStartTime) =>
          updateStartTime({ [key]: newStartTime }),
      }),
    });
  }

  return groups;
};

export type HealthRecoveries = ReturnType<typeof setupRecoveries>;
