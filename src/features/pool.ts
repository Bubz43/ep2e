import { PoolType, PoolEffectUsability, AptitudeType } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import type { SuccessTestModifier } from '@src/success-test/success-test';
import { localImage } from '@src/utility/images';
import { LazyGetter } from 'lazy-get-decorator';
import { clamp } from 'remeda';
import type { PoolEffect, SourcedEffect } from './effects';

type PoolInit = {
  type: PoolType;
  initialValue?: number;
  spent?: number;
};

export enum PostTestPoolAction {
  Improve = 'improveResult',
  FlipFlop = 'flipFlopRoll',
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

  private _bonus = 0;
  private _usableTwice = false;
  private _disabled = false;

  constructor({ type, initialValue = 0, spent = 0 }: PoolInit) {
    this.type = type;
    this.value = initialValue;
    this.spent = spent;
  }

  get bonus() {
    return this._bonus;
  }

  get usableTwice() {
    return this._usableTwice;
  }

  get disabled() {
    return this._disabled;
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

  @LazyGetter()
  get testModifier(): SuccessTestModifier {
    return { name: localize(this.type), value: 20, icon: this.icon };
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
    this._bonus = clamp(this.bonus + val, { min: 0, max: 5 });
    return this;
  }

  private flipUsableTwice(twice: boolean) {
    this._usableTwice = this._usableTwice || twice;
    return this;
  }

  private flipDisabled(disabled: boolean) {
    this._disabled = this._disabled || disabled;
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

export class Pools extends Map<PoolType, Pool> {
  get totalSpent() {
    return [...this.values()].reduce((accum, pool) => accum + pool.spent, 0);
  }

  addEffects(effects: ReadonlyArray<SourcedEffect<PoolEffect>>) {
    for (const effect of effects) {
      this.get(effect.pool)?.addEffect(effect);
    }
    this.forEach(({ max }, type, pools) => max || pools.delete(type));
    return this;
  }
}
