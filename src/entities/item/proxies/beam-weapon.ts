import {
  enumValues,
  RangedWeaponAccessory,
  RangedWeaponTrait,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { difference } from 'remeda';
import { Equippable, Gear, Purchasable, RangedWeapon } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.BeamWeapon> {
  get weaponTraits() {
    return enumValues(RangedWeaponTrait).filter((trait) => this.epData[trait]);
  }
}
export class BeamWeapon extends mix(Base).with(
  Gear,
  Purchasable,
  Equippable,
  RangedWeapon,
) {
  static readonly possibleAccessories = difference(
    enumValues(RangedWeaponAccessory),
    [
      RangedWeaponAccessory.ExtendedMagazine,
      RangedWeaponAccessory.FlashSuppressor,
      RangedWeaponAccessory.Silencer,
      RangedWeaponAccessory.SmartMagazine,
    ],
  );
  constructor(init: ItemProxyInit<ItemType.BeamWeapon>) {
    super(init);
  }

  get range() {
    return this.epData.range;
  }
}
