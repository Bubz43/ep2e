import { DeviceType, EffectStates } from '@src/data-enums';
import type { ObtainableEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import { MeshHealth } from '@src/health/full-mesh-health';
import { notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import { Copyable, Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { AppMeshHealth } from '@src/health/app-mesh-health';

class Base extends ItemProxyBase<ItemType.PhysicalTech> {}
export class PhysicalTech
  extends mix(Base).with(Purchasable, Gear, Equippable, Copyable)
  implements ObtainableEffects {
  constructor(init: ItemProxyInit<ItemType.PhysicalTech>) {
    super(init);
  }

  get fullType() {
    const { wareType, category } = this;
    const localType = localize(wareType || this.type);
    return localType === category || !category
      ? localType
      : `${localType} (${category})`;
  }

  get category() {
    return this.epData.category;
  }

  get state() {
    return this.epData.state;
  }

  get activated() {
    return this.hasActivation && this.state.activated;
  }

  get effectStates() {
    return this.epData.effectStates;
  }

  get hasActivation() {
    return this.effectStates !== EffectStates.Passive;
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

  get onlyLocalEffects() {
    return this.effectStates !== EffectStates.PassiveAndUsable;
  }

  get activationAction() {
    return this.epData.activationAction;
  }

  get hasUse() {
    return this.effectStates === EffectStates.PassiveAndUsable;
  }

  get hasMeshHealth() {
    return !!this.deviceType;
  }

  @LazyGetter()
  get effectGroups() {
    const { effects, activatedEffects, hasActivation } = this;
    // TODO Figure out if passive effects are applied when toggled;
    const group = new Map<'passive' | 'activated', typeof effects>();
    if (notEmpty(effects)) group.set('passive', effects);
    if (hasActivation && notEmpty(activatedEffects))
      group.set('activated', activatedEffects);
    return group;
  }

  @LazyGetter()
  get currentEffects() {
    const { effects, activatedEffects, activated, onlyLocalEffects } = this;
    return {
      source: this.name,
      effects: compact([
        effects,
        activated && onlyLocalEffects && activatedEffects,
      ]).flat(),
    };
  }

  @LazyGetter()
  get meshHealth() {
    return new MeshHealth({
      data: this.epData.meshHealth,
      statMods: undefined,
      updater: this.updater.prop('data', 'meshHealth').nestedStore(),
      source: localize('host'),
      homeDevices: 1, // TODO,
      deathRating: true
    });
  }

  @LazyGetter()
  get firewallHealth() {
    return new AppMeshHealth({
      data: this.epData.firewallHealth,
      source: localize("firewall"),
      updater: this.updater.prop('data', "firewallHealth").nestedStore(),
    })
  }

  getDataCopy(reset = false) {
    const copy = super.getDataCopy(reset);
    copy.data.state = {
      equipped: false,
      disabled: false,
      activated: false,
      embeddedEgos: [],
      onboardAliDeleted: false,
    };
    return copy;
  }
}
