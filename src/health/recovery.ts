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
  getElapsedTime,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import { averageRoll } from '@src/foundry/rolls';
import { nonNegative } from '@src/utility/helpers';

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
};

export type HealsOverTime = {
  ownHealTickStartTime: number;
  aidedHealTickStartTime: number;
  [DotOrHotTarget.Damage]: HealthTick;
  [DotOrHotTarget.Wound]: { amount: number, interval: number };
}
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

export type Recovery = HealthTick & {
  slot: HealingSlot;
  source: string;
  readonly timeToTick: number;
};

export const setupRecoveries = ({
  hot,
  biological,
  effects = [],
}: // conditions,
{
  hot: HealsOverTime;
  biological: boolean;
  effects: ReadonlyArray<SourcedEffect<HealthRecoveryEffect>>;
  // conditions: RecoveryConditions;
}) => {
  const groups = {
    [DotOrHotTarget.Damage]: new Map<HealingSlot, Recovery>(),
    [DotOrHotTarget.Wound]: new Map<HealingSlot, Recovery>(),
    unused: new Map<DotOrHotTarget, Recovery[]>(),
  } as const;

  const slot = biological ? HealingSlot.OwnHealing : HealingSlot.Aided;

  for (const stat of enumValues(DotOrHotTarget)) {
    const group = groups[stat];
    const { amount, ...data } = hot[stat];
    if (amount && data.interval > 0) {
      group.set(slot, {
        ...data,
        amount: String(amount),
        slot,
        source: localize('own'),
        get timeToTick() {
          return nonNegative(
            data.interval -
              getElapsedTime(hot[`${slot}HealTickStartTime` as const]),
          );
        },
      });
    }
  }

  for (const effect of effects) {
    const { stat, technologicallyAided, interval } = effect;
    const amount =
      stat === DotOrHotTarget.Damage
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
    group.set(slot, {
      amount,
      interval,
      slot,
      source: effect[Source],
      get timeToTick() {
        return nonNegative(
          interval - getElapsedTime(hot[`${slot}HealTickStartTime` as const]),
        );
      },
    });
  }

  return groups;
};


export type HealthRecoveries = ReturnType<typeof setupRecoveries>;
