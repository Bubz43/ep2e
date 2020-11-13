import {
  enumValues,
  GearTrait,
  RangedWeaponAccessory,
  RangedWeaponTrait,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import mix from 'mix-with/lib';
import { difference, map } from 'remeda';
import { Equippable, Gear, Purchasable, RangedWeapon } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.SeekerWeapon> {
  get weaponTraits() {
    return enumValues(RangedWeaponTrait).filter((trait) => this.epData[trait]);
  }
}

export class SeekerWeapon extends mix(Base).with(
  Purchasable,
  Equippable,
  Gear,
  RangedWeapon,
) {
  static readonly possibleAccessories = difference(
    enumValues(RangedWeaponAccessory),
    [
      RangedWeaponAccessory.FlashSuppressor,
      RangedWeaponAccessory.Silencer,
      RangedWeaponAccessory.SmartMagazine,
    ],
  );
  constructor(init: ItemProxyInit<ItemType.SeekerWeapon>) {
    super(init);
  }
}
