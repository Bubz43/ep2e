import type { ItemType } from '@src/entities/entity-types';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

export class Substance extends ItemProxyBase<ItemType.Substance> {
  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.Substance> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }
}
