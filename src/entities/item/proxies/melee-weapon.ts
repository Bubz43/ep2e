import { enumValues, GearTrait } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import mix from 'mix-with/lib';
import { map } from 'remeda';
import { Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class MeleeWeaponBase extends ItemProxyBase<ItemType.MeleeWeapon> {}

export class MeleeWeapon extends mix(MeleeWeaponBase).with(
  Gear,
  Purchasable,
  Equippable,
) {
  constructor(init: ItemProxyInit<ItemType.MeleeWeapon>) {
    super(init)
  }
}


