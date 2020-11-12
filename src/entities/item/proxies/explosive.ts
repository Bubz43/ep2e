import { ExplosiveType, ExplosiveSize } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import mix from 'mix-with/lib';
import type { Stackable } from '../item-interfaces';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Explosive> {}

export class Explosive
  extends mix(Base).with(Purchasable)
  implements Stackable {
  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.Explosive> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }

  get explosiveType() {
    return this.epData.explosiveType;
  }

  get size() {
    return this.epData.size;
  }

  get quantity() {
    return this.epData.quantity;
  }

  get fullType() {
    return this.explosiveType === ExplosiveType.Generic
      ? localize(this.type)
      : this.formattedSize;
  }

  get formattedSize() {
    if (this.explosiveType === ExplosiveType.Missile) {
      switch (this.size) {
        case ExplosiveSize.Micro:
          return localize('micromissile');
        case ExplosiveSize.Mini:
          return localize('minimissile');
        case ExplosiveSize.Standard:
          return localize('standardMissile');
      }
    }
    if (this.explosiveType === ExplosiveType.Grenade) {
      switch (this.size) {
        case ExplosiveSize.Micro:
        case ExplosiveSize.Mini:
          return localize('minigrenade');

        case ExplosiveSize.Standard:
          return localize('standardGrenade');
      }
    }
    return '';
  }
}
