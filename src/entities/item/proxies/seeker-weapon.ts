import { enumValues, GearTrait } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import mix from 'mix-with/lib';
import { map } from 'remeda';
import { Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.SeekerWeapon> {}

export class SeekerWeapon extends mix(Base).with(
  Purchasable,
  Equippable,
  Gear,
) {
  constructor(init: ItemProxyInit<ItemType.SeekerWeapon>) {
    super(init)
  }
  getTextInfo(): string[] {
    return map(this.gearTraits, localize);
  }
}
