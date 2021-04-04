import { SleightSpecial, SleightType } from '@src/data-enums';
import type { AddEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import { createEffect, multiplyEffectModifier } from '@src/features/effects';
import { createLiveTimeState } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { LazyGetter } from 'lazy-get-decorator';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

export class Sleight extends ItemProxyBase<ItemType.Sleight> {
  readonly temporary;
  constructor({
    temporary,
    ...init
  }: ItemProxyInit<ItemType.Sleight> & { temporary?: string }) {
    super(init);
    this.temporary = temporary;
  }

  get fullType() {
    return `${localize('psi')}-${localize(this.sleightType)} ${localize(
      this.type,
    )}`;
  }

  updateSort(newSort: number) {
    return this.updater.path('sort').commit(newSort);
  }

  get sleightType() {
    return this.epData.sleightType;
  }

  get isChi() {
    return this.sleightType === SleightType.Chi;
  }

  get effectsOnSelf() {
    return this.epData.effectsOnSelf;
  }

  get effectsOnTarget() {
    return this.epData.effectsOnTarget;
  }

  get status() {
    return this.epData.status;
  }

  get isPushed() {
    return this.isChi && this.status.pushed;
  }

  @LazyGetter()
  get pushTimer() {
    return createLiveTimeState({
      label: `${this.name} (${localize('pushed')})`,
      id: this.id,
      duration: this.status.pushDuration,
      startTime: this.status.pushStartTime,
      updateStartTime: this.updater.path('data', 'status', 'pushStartTime')
        .commit,
    });
  }

  getPassiveMentalArmor(willpower: number) {
    return Math.round(willpower / this.epData.mentalArmor.divisor || 1);
  }

  get appliesArmor() {
    return this.epData.special === SleightSpecial.MentalArmor;
  }

  getPassiveEffects(willpower: number, enhanced: boolean): AddEffects {
    const { effectsOnSelf } = this;
    const pushed = enhanced || this.isPushed;
    const effects = this.appliesArmor
      ? [
          ...effectsOnSelf,
          createEffect.armor({
            mental: this.getPassiveMentalArmor(willpower),
            concealable: true,
            layerable: true,
          }),
        ]
      : effectsOnSelf;
    return {
      source: `${this.name} ${pushed ? localize('pushed') : ''}`,
      effects: pushed
        ? effects.map((effect) => multiplyEffectModifier(effect, 2))
        : effects,
    };
  }

  getDataCopy(reset: boolean) {
    const copy = super.getDataCopy(reset);
    copy.data.status = {
      sustained: false,
      pushDuration: 0,
      pushStartTime: 0,
      pushed: false,
    };
    return copy;
  }
}
