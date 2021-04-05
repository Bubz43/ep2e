import { SleightDuration, SleightType } from '@src/data-enums';
import type { AddEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import { createEffect, multiplyEffectModifier } from '@src/features/effects';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { createLiveTimeState, currentWorldTimeMS } from '@src/features/time';
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

  get toSelf() {
    return this.epData.toSelf;
  }

  get toTarget() {
    return this.epData.toTarget;
  }

  get effectsOnSelf() {
    return this.epData.toSelf.effects;
  }

  get effectsOnTarget() {
    return this.epData.toTarget.effects;
  }

  get status() {
    return this.epData.status;
  }

  get isPushed() {
    return this.isChi && this.status.pushed;
  }

  get action() {
    return this.epData.action;
  }

  get isTemporary() {
    return ![SleightDuration.Instant, SleightDuration.Sustained].includes(
      this.epData.duration,
    );
  }

  psiPush(willpower: number) {
    return this.updater.path('data', 'status').commit({
      pushDuration: toMilliseconds({ minutes: Math.round(willpower / 5) }),
      pushStartTime: currentWorldTimeMS(),
      pushed: true,
    });
  }

  endPush() {
    return this.updater.path('data', 'status', 'pushed').commit(false);
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

  getPassiveMentalArmor(willpower: number, divisor: number) {
    return Math.round(willpower / divisor || 1);
  }

  getPassiveEffects(willpower: number, enhanced: boolean): AddEffects {
    const { effectsOnSelf } = this;
    const pushed = enhanced || this.isPushed;
    const effects = this.toSelf.mentalArmor.apply
      ? [
          ...effectsOnSelf,
          createEffect.armor({
            mental: this.getPassiveMentalArmor(
              willpower,
              this.toSelf.mentalArmor.divisor,
            ),
            concealable: true,
            layerable: true,
          }),
        ]
      : effectsOnSelf;
    return {
      source: `${this.name} ${
        pushed ? `(${localize(enhanced ? 'enhanced' : 'pushed')})` : ''
      }`,
      effects: pushed
        ? effects.map((effect) => multiplyEffectModifier(effect, 2))
        : effects,
    };
  }

  getDataCopy(reset?: boolean) {
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
