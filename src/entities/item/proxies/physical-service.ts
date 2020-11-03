import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.PhysicalService> {}
export class PhysicalService extends mix(Base).with(Purchasable) {
  constructor(init: ItemProxyInit<ItemType.PhysicalService>) {
    super(init);
  }
}
