import {
  createBaseAttackFormula,
  MeleeWeaponAttack,
  MeleeWeaponAttackData,
} from '@src/combat/attacks';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import type { Attacker } from '../item-interfaces';
import { Equippable, Gear, Purchasable } from '../item-mixins';
import { Explosive } from './explosive';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Substance } from './substance';

class MeleeWeaponBase extends ItemProxyBase<ItemType.MeleeWeapon> {}

export class MeleeWeapon
  extends mix(MeleeWeaponBase).with(Gear, Purchasable, Equippable)
  implements Attacker<MeleeWeaponAttackData, MeleeWeaponAttack> {
  constructor(init: ItemProxyInit<ItemType.MeleeWeapon>) {
    super(init);
  }

  get hasSecondaryAttack() {
    return this.epData.hasSecondaryAttack;
  }

  get augmentUnarmed() {
    return this.epData.augmentUnarmed;
  }

  get acceptsPayload() {
    return this.epData.acceptsPayload;
  }

  @LazyGetter()
  get attacks() {
    return {
      primary: this.setupAttack(
        this.epData.primaryAttack,
        localize('primaryAttack'),
      ),
      secondary: this.hasSecondaryAttack
        ? this.setupAttack(
            this.epData.secondaryAttack,
            localize('secondaryAttack'),
          )
        : null,
    };
  }

  setupAttack(
    { damageFormula, label, ...data }: MeleeWeaponAttackData,
    defaultLabel: string,
  ): MeleeWeaponAttack {
    return {
      armorUsed: [ArmorType.Kinetic],
      reduceAVbyDV: false,
      ...data,
      label: this.hasSecondaryAttack ? label || defaultLabel : '',
      rollFormulas:
        damageFormula
          ? [createBaseAttackFormula(damageFormula)]
          : [],
      coating: this.coating,
      payload: this.payload,
    };
  }

  @LazyGetter()
  get payload() {
    const explosive = this.epFlags?.payload?.[0];
    return explosive
      ? new Explosive({ data: explosive, embedded: this.name, loaded: true })
      : null;
  }

  @LazyGetter()
  get coating() {
    const substance = this.epFlags?.coating?.[0];
    return substance
      ? new Substance({ data: substance, embedded: this.name, loaded: true })
      : null;
  }

  setCoating(substance: Substance | ReturnType<Substance['getDataCopy']>) {
    const substanceData =
      substance instanceof Substance ? substance.getDataCopy() : substance;
    substanceData.data = { ...substanceData.data, quantity: 1 };
    this.updater.prop('flags', EP.Name, 'coating').commit([substanceData]);
  }

  removeCoating() {
    this.updater.prop('flags', EP.Name, 'coating').commit(null);
  }

  setPayload(payload: Explosive) {
    this.updater
      .prop('flags', EP.Name, 'payload')
      .commit([payload.getDataCopy()]);
  }

  removePayload() {
    this.updater.prop('flags', EP.Name, 'payload').commit(null);
  }
}
