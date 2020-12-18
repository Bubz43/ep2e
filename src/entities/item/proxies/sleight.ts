import type { ItemType } from '@src/entities/entity-types';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

export class Sleight extends ItemProxyBase<ItemType.Sleight> {
  readonly temporary;
  constructor({ temporary, ...init }: ItemProxyInit<ItemType.Sleight> & { temporary?: boolean }) {
    super(init);
    this.temporary = temporary;
  }
}
