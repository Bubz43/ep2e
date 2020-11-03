import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Software> {}
export class Software extends mix(Base).with(Purchasable) {
  constructor(init: ItemProxyInit<ItemType.Software>) {
    super(init);
  }
}
