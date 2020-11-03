import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Firearm> {}
export class Firearm extends mix(Base).with(Purchasable, Gear, Equippable) {
  constructor(init: ItemProxyInit<ItemType.Firearm>) {
    super(init)
  }
}
