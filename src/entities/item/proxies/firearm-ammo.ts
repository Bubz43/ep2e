import type { ItemType } from '@src/entities/entity-types';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

export class FirearmAmmo extends ItemProxyBase<ItemType.FirearmAmmo> {
  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.FirearmAmmo> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }
}
