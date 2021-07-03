import type { SleightAttack } from '@src/combat/attacks';
import { SleightDuration, SleightType } from '@src/data-enums';
import type { AddEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { createEffect, multiplyEffectModifier } from '@src/features/effects';
import { addFeature } from '@src/features/feature-helpers';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { createTag } from '@src/features/tags';
import { createLiveTimeState, currentWorldTimeMS } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { LazyGetter } from 'lazy-get-decorator';
import { compact } from 'remeda';
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

  get effectsToSelf() {
    return this.epData.effectsToSelf;
  }

  get effectsToTarget() {
    return this.epData.effectsToTarget;
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
    return !this.isChi && this.status.sustaining;
  }

  get mentalArmor() {
    return this.epData.mentalArmor;
  }

  get scaleEffectsOnSuperior() {
    return this.epData.scaleEffectsOnSuperior;
  }

  get hasAttack() {
    return !!this.epData.attack.damageFormula;
  }

  get hasHeal() {
    return !!this.epData.heal.formula;
  }

  get armorUsed() {
    return (
      this.epFlags?.attackArmorUsed ||
      (this.epData.attack.useMentalArmor ? ArmorType.Mental : null)
    );
  }

  get attack(): SleightAttack {
    const { attackTraits, damageType, damageFormula, notes } =
      this.epData.attack;
    return {
      armorPiercing: false,
      armorUsed: compact([this.armorUsed]),
      attackTraits: attackTraits,
      damageType: damageType,
      reduceAVbyDV: false,
      label: localize('attack'),
      rollFormulas: damageFormula
        ? [{ label: localize('base'), formula: damageFormula }]
        : [],
      notes,
    };
  }

  setSustainOn(
    sustainingOn: { name: string; uuid: string; temporaryFeatureId: string }[],
    sustaining: boolean,
  ) {
    return this.updater
      .path('data', 'status')
      .commit({ sustainingOn, sustaining });
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

  @LazyGetter()
  get effectsFromSustaining(): AddEffects {
    return {
      effects: addFeature(
        this.effectsToSelf,
        createEffect.successTest({
          modifier: -10,
          tags: [createTag.allActions({})],
        }),
      ),
      source: `${localize('sustaining')} ${this.name}`,
    };
  }

  getPassiveEffects(willpower: number, enhanced: boolean): AddEffects {
    const { effectsToSelf: effects } = this;
    const pushed = enhanced || this.isPushed;
    const allEffects = this.mentalArmor.apply
      ? [
          ...effects,
          createEffect.armor({
            mental: this.getPassiveMentalArmor(
              willpower,
              this.mentalArmor.divisor,
            ),
            concealable: true,
            layerable: true,
          }),
        ]
      : effects;
    return {
      source: `${this.name} ${
        pushed ? `(${localize(enhanced ? 'enhanced' : 'pushed')})` : ''
      }`,
      effects: pushed
        ? allEffects.map((effect) => multiplyEffectModifier(effect, 2))
        : allEffects,
    };
  }

  get exoticSkillName() {
    return this.epFlags?.exoticSkill;
  }

  getDataCopy(reset?: boolean) {
    const copy = super.getDataCopy(reset);
    copy.data.status = {
      sustaining: false,
      sustainingOn: [],
      pushDuration: 0,
      pushStartTime: 0,
      pushed: false,
    };
    return copy;
  }
}
