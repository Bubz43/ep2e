import { Activation, DeviceType } from '@src/data-enums';
import type { ObtainableEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import { Copyable, Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.PhysicalTech> {}
export class PhysicalTech
  extends mix(Base).with(Purchasable, Gear, Equippable, Copyable)
  implements ObtainableEffects {
  constructor(init: ItemProxyInit<ItemType.PhysicalTech>) {
    super(init);
  }

  get state() {
    return this.epData.state;
  }

  get activated() {
    return this.activation !== Activation.None && this.state.activated;
  }

  get activation() {
    return this.epData.activation;
  }

  get effects() {
    return this.epData.effects;
  }

  get activatedEffects() {
    return this.epData.activatedEffects;
  }

  get deviceType() {
    return this.epData.deviceType;
  }

  get isBrain() {
    return this.deviceType === DeviceType.Host;
  }

  obtainEffects() {
    const { effects, activatedEffects, activated, wareType, equipped } = this;
    if (!equipped) return null;
    return {
      source: this.name,
      effects: compact([effects, activated && activatedEffects]).flat(),
    };
  }
}
