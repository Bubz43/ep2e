import { PoolType, PoolEffectUsability, AptitudeType } from '@src/data-enums';
import { EP } from '@src/foundry/system';
import { localImage } from '@src/utility/images';
import { clamp } from 'remeda';
import type { PoolEffect } from './effects';

type PoolInit = {
  type: PoolType;
  initialValue?: number;
  spent?: number;
};

export enum PostTestPoolAction {
  Improve,
  FlipFlop,
}

export enum PreTestPoolAction {
  Bonus = 'bonus',
  IgnoreMods = 'ignoreMods',
}

export type TestPoolState = {
  available: number;
  usableTwice: boolean;
  usedActions: (PostTestPoolAction | PreTestPoolAction)[];
};

export const poolIcon = (type: PoolType) =>
  localImage(`icons/pools/${type}.png`);

export type ReadonlyPool = Omit<Pool, 'addEffect'>;
export class Pool {
  readonly type: PoolType;
  readonly value: number;
  readonly spent: number;

  #bonus = 0;
  #usableTwice = false;
  #disabled = false;

  constructor({ type, initialValue = 0, spent = 0 }: PoolInit) {
    this.type = type;
    this.value = initialValue;
    this.spent = spent;
  }

  get bonus() {
    return this.#bonus;
  }

  get usableTwice() {
    return this.#usableTwice;
  }

  get disabled() {
    return this.#disabled;
  }

  get max() {
    return this.value + this.bonus;
  }

  get available() {
    return clamp(this.max - this.spent, { min: 0, max: this.max });
  }

  get icon() {
    return poolIcon(this.type);
  }

  addEffect({ modifier, usabilityModification }: PoolEffect) {
    const disable = usabilityModification === PoolEffectUsability.Disable;
    return this.addBonus(disable ? 0 : modifier)
      .flipUsableTwice(
        usabilityModification === PoolEffectUsability.UsableTwice,
      )
      .flipDisabled(usabilityModification === PoolEffectUsability.Disable);
  }

  private addBonus(val: number) {
    this.#bonus = clamp(this.#bonus + val, { min: 0, max: 5 });
    return this;
  }

  private flipUsableTwice(twice: boolean) {
    this.#usableTwice = this.#usableTwice || twice;
    return this;
  }

  private flipDisabled(disabled: boolean) {
    this.#disabled = this.#disabled || disabled;
    return this;
  }

  static linkedToAptitude(aptitude: AptitudeType) {
    switch (aptitude) {
      case AptitudeType.Cognition:
      case AptitudeType.Intuition:
        return PoolType.Insight;

      case AptitudeType.Reflexes:
      case AptitudeType.Somatics:
        return PoolType.Vigor;

      case AptitudeType.Savvy:
      case AptitudeType.Willpower:
        return PoolType.Moxie;
    }
  }
}
