export enum DotOrHotTarget {
  Damage = 'damage',
  Wound = 'wound',
}

export enum RecoveryConditions {
  Normal = 'normal',
  Poor = 'poor',
  Harsh = 'harsh',
}

export type HealthTick = {
  amount: string;
  interval: number;
  lastUnaidedTick: number;
  lastAidedTick: number;
};
