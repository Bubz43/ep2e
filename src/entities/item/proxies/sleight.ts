import { SleightDuration, SleightType } from '@src/data-enums';
import type { AddEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import { createEffect, multiplyEffectModifier } from '@src/features/effects';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { createTag } from '@src/features/tags';
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

  get fullName() {
    return `${this.name} ${
      this.isSustaining ? `(${localize('sustaining')})` : ''
    }`;
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

  get duration() {
    return this.epData.duration;
  }

  get isTemporary() {
    return ![SleightDuration.Instant, SleightDuration.Sustained].includes(
      this.epData.duration,
    );
  }

  get infectionMod() {
    return this.epData.infectionMod;
  }

  get isSustaining() {
    return !this.isChi && this.status.sustainingOn.length;
  }

  get sustainingModifier(): AddEffects {
    return {
      effects: [
        createEffect.successTest({
          modifier: -10,
          tags: [createTag.allActions({})],
        }),
      ],
      source: `${localize('sustaining')} ${this.name}`,
    };
  }

  startSustaining(
    entities: { name: string; uuid: string; temporaryFeatureId: string }[],
  ) {
    return this.updater.path('data', 'status', 'sustainingOn').commit(entities);
  }

  stopSustaining() {
    const currentlySustainingOn = this.status.sustainingOn;
    // TODO Create message so entities its sustained on can undo
    return this.updater.path('data', 'status', 'sustainingOn').commit([]);
  }

  getTotalDuration(willpower: number, increasedDuration: boolean) {
    const { duration } = this;
    if (
      duration === SleightDuration.Sustained ||
      duration === SleightDuration.Instant
    )
      return -1;
    const base = (willpower / 5) * (increasedDuration ? 2 : 1);
    switch (duration) {
      case SleightDuration.Minutes:
        return toMilliseconds({ minutes: base });
      case SleightDuration.Hours:
        return toMilliseconds({ hours: base });
      case SleightDuration.ActionTurns:
        return toMilliseconds({ seconds: base * 3 });
    }
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
      sustainingOn: [],
      pushDuration: 0,
      pushStartTime: 0,
      pushed: false,
    };
    return copy;
  }
}
