import { RechargeType } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { withSign } from '@src/utility/helpers';
import { clamp } from 'remeda';
import { RechargeEffect, RechargeStat } from './effects';
import { toMilliseconds } from './modify-milliseconds';
import {
  CommonInterval,
  currentWorldTimeMS,
  getElapsedTime,
  prettyMilliseconds,
} from './time';

const baseRechargeInfo = {
  [RechargeType.Short]: {
    max: 2,
    duration: toMilliseconds({ minutes: 10 }),
  },
  [RechargeType.Long]: {
    max: 1,
    biologicalDuration: toMilliseconds({ hours: 8 }),
    duration: toMilliseconds({ hours: 4 }),
  },
} as const;

export type RechargeData = Readonly<{
  /**
   * @minimum 0
   */
  taken: number;
  /**
   * @minimum 0
   */
  refreshTimer: number;
}>;

type RechargeInit = RechargeData & {
  inBiological: boolean;
  type: RechargeType;
};

export type ReadonlyRecharge = Omit<Recharge, 'addEffect'>;
export class Recharge {
  readonly type: RechargeType;
  readonly taken: number;
  readonly refreshTimer: number;

  #poolRecoverMod = 0;
  #timeframe: number;
  #max: number;

  constructor({ type, inBiological, taken, refreshTimer }: RechargeInit) {
    this.type = type;
    this.taken = taken;
    this.refreshTimer = refreshTimer;

    this.#max = baseRechargeInfo[this.type].max;

    this.#timeframe =
      this.type === RechargeType.Short || !inBiological
        ? baseRechargeInfo[this.type].duration
        : baseRechargeInfo[this.type].biologicalDuration;
  }

  get timeframe() {
    return this.#timeframe;
  }

  get poolRecoverMod() {
    return this.#poolRecoverMod;
  }

  get max() {
    return this.#max;
  }

  get available() {
    return clamp(this.max - this.taken, { min: 0, max: this.max });
  }

  addEffect({ stat, modifier, recharge }: RechargeEffect) {
    if (recharge !== this.type) return;

    switch (stat) {
      case RechargeStat.Duration:
        this.#timeframe = Math.min(this.#timeframe, modifier);
        break;

      case RechargeStat.MaxUses:
        this.#max += modifier;
        break;

      case RechargeStat.PoolsRecovered:
        this.#poolRecoverMod += modifier;
        break;
    }
  }

  get finalRefresh() {
    const current = currentWorldTimeMS();
    return clamp(this.refreshTimer, {
      min: current - CommonInterval.Day,
      max: current,
    });
  }

  get timer() {
    const max = CommonInterval.Day;
    const elapsed = getElapsedTime(this.finalRefresh);
    return {
      label: localize(this.type),
      elapsed,
      max,
      remaining: max - elapsed,
    };
  }

  get startInfo() {
    const { timeframe, poolRecoverMod, type } = this;
    const baseRecovery = type === RechargeType.Short ? '1d6' : '-1';
    const formula = poolRecoverMod
      ? `${baseRecovery} ${withSign(poolRecoverMod)}`
      : baseRecovery;

    return { timeframe, formula };
  }
}
