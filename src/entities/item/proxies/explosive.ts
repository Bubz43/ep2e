import {
  createBaseAttackFormula,
  ExplosiveAttack,
  ExplosiveAttackData,
} from '@src/combat/attacks';
import { ExplosiveType, ExplosiveSize } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import type { Attacker, Stackable } from '../item-interfaces';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Substance } from './substance';

class Base extends ItemProxyBase<ItemType.Explosive> {}

export class Explosive
  extends mix(Base).with(Purchasable)
  implements Stackable, Attacker<ExplosiveAttackData, ExplosiveAttack> {
  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.Explosive> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }

  @LazyGetter()
  get substance() {
    const substanceData = this.epFlags?.substance;
    return substanceData ? new Substance({
      data: substanceData[0],
      embedded: this.name,
      loaded: true,
    }) : null
  }

  @LazyGetter()
  get attacks() {
    return {
      primary: this.setupAttack(
        this.epData.primaryAttack,
        localize('primaryAttack'),
      ),
      secondary: this.hasSecondaryMode
        ? this.setupAttack(
            this.epData.secondaryAttack,
            localize('secondaryAttack'),
          )
        : null,
    };
  }

  setupAttack(
    { label, damageFormula, armorUsed, ...data }: ExplosiveAttackData,
    defaultLabel: string,
  ): ExplosiveAttack {
    const { areaEffect, areaEffectRadius } = this;
    return {
      ...data,
      armorUsed: compact([armorUsed]),
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
      armorPiercing: false,
      reduceAVbyDV: false,
      label: this.hasSecondaryMode ? label || defaultLabel : '',
      areaEffect,
      areaEffectRadius,
    };
  }

  get canContainSubstance() {
    return this.epData.containSubstance
  }

  get hasSecondaryMode() {
    return this.epData.hasSecondaryMode;
  }

  get areaEffect() {
    return this.epData.areaEffect;
  }

  get areaEffectRadius() {
    return this.epData.areaEffectRadius;
  }

  get explosiveType() {
    return this.epData.explosiveType;
  }

  get size() {
    return this.epData.size;
  }

  get quantity() {
    return this.epData.quantity;
  }

  get fullType() {
    return this.explosiveType === ExplosiveType.Generic
      ? localize(this.type)
      : this.formattedSize;
  }

  get formattedSize() {
    if (this.explosiveType === ExplosiveType.Missile) {
      switch (this.size) {
        case ExplosiveSize.Micro:
          return localize('micromissile');
        case ExplosiveSize.Mini:
          return localize('minimissile');
        case ExplosiveSize.Standard:
          return localize('standardMissile');
      }
    }
    if (this.explosiveType === ExplosiveType.Grenade) {
      switch (this.size) {
        case ExplosiveSize.Micro:
        case ExplosiveSize.Mini:
          return localize('minigrenade');

        case ExplosiveSize.Standard:
          return localize('standardGrenade');
      }
    }
    return '';
  }

  setSubstance(substance: Substance) {
    this.updater
      .prop('flags', EP.Name, 'substance')
      .commit([substance.getDataCopy()]);
  }

  removeSubstance() {
    this.updater.prop('flags', EP.Name, 'substance').commit(null);
  }
}
