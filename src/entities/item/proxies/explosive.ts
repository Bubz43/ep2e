import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Explosive> {}

export class Explosive extends mix(Base).with(Purchasable) {
  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.Explosive> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }
}
