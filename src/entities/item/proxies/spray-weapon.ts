import { enumValues, RangedWeaponAccessory } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { difference } from 'remeda';
import { Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.SprayWeapon> {}
export class SprayWeapon extends mix(Base).with(Gear, Purchasable, Equippable) {
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
}
