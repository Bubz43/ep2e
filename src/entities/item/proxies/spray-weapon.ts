import {
  createBaseAttackFormula,
  SprayWeaponAttack,
  SprayWeaponAttackData,
} from '@src/combat/attacks';
import {
  enumValues,
  RangedWeaponAccessory,
  RangedWeaponTrait,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact, difference } from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Equippable, Gear, Purchasable, RangedWeapon } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.SprayWeapon> {
  get weaponTraits() {
    const { long, fixed } = this.epData;
    return compact([
      long && RangedWeaponTrait.Long,
      fixed && RangedWeaponTrait.Fixed,
    ]);
  }
}
export class SprayWeapon
  extends mix(Base).with(Gear, Purchasable, Equippable, RangedWeapon)
  implements Attacker<SprayWeaponAttackData, SprayWeaponAttack> {
  static readonly possibleAccessories = difference(
    enumValues(RangedWeaponAccessory),
    [
      RangedWeaponAccessory.ExtendedMagazine,
      RangedWeaponAccessory.FlashSuppressor,
      RangedWeaponAccessory.Silencer,
      RangedWeaponAccessory.SmartMagazine,
    ],
  );
  constructor(init: ItemProxyInit<ItemType.SprayWeapon>) {
    super(init);
  }

  @LazyGetter()
  get attacks() {
    return {
      primary: this.setupAttack(this.epData.primaryAttack),
      secondary: null,
    };
  }

  setupAttack({
    damageFormula,
    armorUsed,
    ...data
  }: SprayWeaponAttackData): SprayWeaponAttack {
    return {
      label: '',
      ...data,
      armorUsed: compact([armorUsed]),
      reduceAVbyDV: false,
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
    };
  }

  get range() {
    return this.epData.range;
  }
}
