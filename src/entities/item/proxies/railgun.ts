import {
  createBaseAttackFormula,
  KineticWeaponAttack,
  KineticWeaponAttackData,
} from '@src/combat/attacks';
import {
  enumValues,
  RangedWeaponAccessory,
  RangedWeaponTrait,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact, difference } from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Equippable, Gear, Purchasable, RangedWeapon } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Railgun> {
  get weaponTraits() {
    const { long, fixed } = this.epData;
    return compact([
      long && RangedWeaponTrait.Long,
      fixed && RangedWeaponTrait.Fixed,
    ]);
  }
}
export class Railgun
  extends mix(Base).with(Purchasable, Gear, Equippable, RangedWeapon)
  implements Attacker<KineticWeaponAttackData, KineticWeaponAttack> {
  static readonly possibleAccessories = difference(
    enumValues(RangedWeaponAccessory),
    [
      RangedWeaponAccessory.ExtendedMagazine,
      RangedWeaponAccessory.FlashSuppressor,
      RangedWeaponAccessory.Silencer,
      RangedWeaponAccessory.SmartMagazine,
    ],
  );

  constructor(init: ItemProxyInit<ItemType.Railgun>) {
    super(init);
  }

  get isPolygun() {
    return notEmpty(this.epFlags?.alternativeStates) 
  }

  @LazyGetter()
  get ammoState() {
    return {
      ...this.epData.ammo,
      hasChamber: true,
    };
  }

  get batteryState() {
    return this.epData.battery;
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
    ...data
  }: KineticWeaponAttackData): KineticWeaponAttack {
    return {
      armorUsed: [ArmorType.Kinetic],
      armorPiercing: true,
      reduceAVbyDV: false,
      ...data,
      label: '',
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
      specialAmmo: null,
    };
  }
}
