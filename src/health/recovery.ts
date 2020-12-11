import { enumValues } from '@src/data-enums';
import {
  HealthRecoveryEffect,
  Source,
  SourcedEffect,
} from '@src/features/effects';
import { createFeature } from '@src/features/feature-helpers';
import {
  prettyMilliseconds,
  currentWorldTimeMS,
  Timestamp,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { averageRoll } from '@src/foundry/rolls';

export enum NaturalMentalHeal {
  Stress = 'stress',
  Trauma = 'trauma',
  Disorder = 'disorder',
}

export type NaturalMentalHealAttempt = {
  heal: NaturalMentalHeal;
  failed: boolean;
} & Timestamp;

export const createMentalHealthAttempt = createFeature<
  NaturalMentalHealAttempt,
  'heal' | 'failed'
>(() => ({
  realTimeMS: Date.now(),
  worldTimeMS: currentWorldTimeMS(),
}));

export enum DotOrHotTarget {
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
  // lastUnaidedTick: number;
  // lastAidedTick: number;
};

export type HealsOverTime = {
  ownHealTickStartTime: number;
  aidedHealTickStartTime: number;
} & { [key in DotOrHotTarget]: HealthTick };

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
  readonly activeRegens: Record<DotOrHotTarget, boolean>;
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
  { amount, interval }: BasicTickInfo,
  conditions = RecoveryConditions.Normal,
) => {
  return [
    amount || '-',
    localize('per').toLocaleLowerCase(),
    prettyMilliseconds(interval * recoveryMultiplier(conditions), {
      compact: true,
      approx: true,
    }),
  ].join(' ');
};

export const tickRate = ({ amount, interval }: BasicTickInfo) =>
  averageRoll(amount) / interval;

export const healingSlotToProp = (slot: HealingSlot) =>
  slot === HealingSlot.Aided ? 'lastAidedTick' : 'lastUnaidedTick';

type Recovery = {
  amount: string;
  interval: number;
  
  }

const setupRecoveries = ({
  hot,
  biological,
  effects = [],
  conditions,
}: {
  hot: HealsOverTime;
  biological: boolean;
  effects: ReadonlyArray<SourcedEffect<HealthRecoveryEffect>>;
  conditions: RecoveryConditions;
}) => {
  const groups = {
    [DotOrHotTarget.Damage]: new Map<HealingSlot, Recovery>(),
    [DotOrHotTarget.Wound]: new Map<HealingSlot, Recovery>(),
  } as const;


};

export const setupHealthRecoveries = (
  hot: HealsOverTime,
  biological: boolean,
  effects: ReadonlyArray<SourcedEffect<HealthRecoveryEffect>> = [],
) => {
  // TODO: Also need healing timeframe duration effect
  const groups = {
    [DotOrHotTarget.Damage]: new Map<HealingSlot, HealthRecovery>(),
    [DotOrHotTarget.Wound]: new Map<HealingSlot, HealthRecovery>(),
  } as const;

  const innate = biological ? HealingSlot.OwnHealing : HealingSlot.Aided;
  const getTimeSince = (slot: HealingSlot) =>
    hot[`${slot}HealTickStartTime` as const];

  for (const stat of enumValues(DotOrHotTarget)) {
    const group = groups[stat];
    group.set(innate, {
      ...hot[stat],
      slot: innate,
      source: localize('innate'),
      timeSinceTick: getTimeSince(innate),
    });
  }

  for (const effect of effects) {
    const { amount, stat, technologicallyAided, interval } = effect;
    const group = groups[stat];
    const slot =
      technologicallyAided || !biological
        ? HealingSlot.Aided
        : HealingSlot.OwnHealing;
    const current = group.get(slot);
    if (!amount || (current && tickRate(current) > tickRate(effect))) continue;
    group.set(slot, {
      amount,
      interval,
      slot,
      source: effect[Source],
      timeSinceTick: current?.timeSinceTick || getTimeSince(slot),
    });
  }

  for (const stat of enumValues(DotOrHotTarget)) {
    groups[stat].forEach(({ amount, interval }, slot, map) => {
      if (!amount || interval <= 0) map.delete(slot);
    });
  }

  return groups;
};

export type HealthRecoveries = ReturnType<typeof setupHealthRecoveries>;
