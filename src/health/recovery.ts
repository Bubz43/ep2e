import { enumValues } from '@src/data-enums';
import type { AppliedEffects } from '@src/entities/applied-effects';
import { applyDurationMultipliers, Source } from '@src/features/effects';
import { createFeature } from '@src/features/feature-helpers';
import {
  createLiveTimeState,
  currentWorldTimeMS,
  LiveTimeState,
  prettyMilliseconds,
  Timestamp,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { averageRoll, rollLimit } from '@src/foundry/rolls';
import { nonNegative } from '@src/utility/helpers';
import { clamp, compact } from 'remeda';

export const useCurrentWorldTimeFlag = -1 as const;

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

export const tickRate = async ({ amount, interval }: BasicTickInfo) =>
 (await averageRoll(amount)) / interval;

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

      let startTime = hot[key];
      if (startTime === -1) startTime = currentWorldTimeMS();
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
          startTime,
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

    let startTime = hot[key];
    if (startTime === -1) startTime = currentWorldTimeMS();
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
        startTime,
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

export const getMaxRecoveryInstances = async ({
  health,
  target,
  amount,
  instances,
}: {
  health: { damage: number; wounds: number };
  target: HealOverTimeTarget;
  amount: string;
  instances: number;
}) => {
  const maxHeal =
    target === HealOverTimeTarget.Damage ? health.damage : health.wounds;
  const maxRequired = nonNegative(
    Math.trunc(maxHeal / (await rollLimit(amount, 'min'))),
  );
  return clamp(Math.floor(instances), {
    max: maxRequired || 1,
    min: 1,
  });
};
