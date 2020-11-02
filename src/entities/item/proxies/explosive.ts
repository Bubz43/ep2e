import type { ItemType } from '@src/entities/entity-types';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

export class Explosive extends ItemProxyBase<ItemType.Explosive> {
  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.Explosive> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }
}
