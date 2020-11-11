import type { ItemType } from '@src/entities/entity-types';
import { ItemProxyBase } from './item-proxy-base';

export class Psi extends ItemProxyBase<ItemType.Psi> {
  get level() {
    return this.epData.level;
  }
}
