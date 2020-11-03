import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Armor> {}
export class Armor extends mix(Base).with(Equippable, Purchasable) {
  constructor(init: ItemProxyInit<ItemType.Armor>) {
    super(init)
  }
}
