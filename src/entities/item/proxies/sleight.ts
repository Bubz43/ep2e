import { SleightType } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

export class Sleight extends ItemProxyBase<ItemType.Sleight> {
  readonly temporary;
  constructor({
    temporary,
    ...init
  }: ItemProxyInit<ItemType.Sleight> & { temporary?: string }) {
    super(init);
    this.temporary = temporary;
  }

  updateSort(newSort: number) {
    return this.updater.path('sort').commit(newSort);
  }

  get sleightType() {
    return this.epData.sleightType;
  }

  get isChi() {
    return this.sleightType === SleightType.Chi;
  }
}
