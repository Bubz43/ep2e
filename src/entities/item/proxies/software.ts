import { SoftwareType } from '@src/data-enums';
import type { ObtainableEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

const serviceTypes = [SoftwareType.AppAsService, SoftwareType.MeshService];

class Base extends ItemProxyBase<ItemType.Software> {}
export class Software
  extends mix(Base).with(Purchasable)
  implements ObtainableEffects {
  constructor(init: ItemProxyInit<ItemType.Software>) {
    super(init);
  }

  get softwareType() {
    return this.epData.softwareType;
  }

  get settings() {
    return this.epData.settings;
  }

  get isService() {
    return serviceTypes.includes(this.softwareType);
  }

  get state() {
    return this.epData.state;
  }

  get effects() {
    return this.epData.effects;
  }

  get hasActiveState() {
    return this.settings.hasActiveState;
  }

  get activeStateEffects() {
    return this.epData.activatedEffects;
  }

  get activated() {
    return this.hasActiveState && this.state.activated;
  }

  get equipped() {
    return this.state.equipped;
  }

  @LazyGetter()
  get currentEffects() {
    const { effects, activeStateEffects, activated, equipped } = this;
    if (!equipped) return null;
    return {
      source: `${this.name} ${activated ? `(${localize('activated')})` : ''}`,
      effects: effects.concat(activated ? activeStateEffects : []),
    };
  }
}
