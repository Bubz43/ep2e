import { DeviceType, EffectStates } from '@src/data-enums';
import { Ego } from '@src/entities/actor/ego';
import type { ObtainableEffects } from '@src/entities/applied-effects';
import { ItemType } from '@src/entities/entity-types';
import { createEgoData, setupItemOperations } from '@src/entities/models';
import { UpdateStore } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import { deepMerge } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { AppMeshHealth } from '@src/health/app-mesh-health';
import { MeshHealth } from '@src/health/full-mesh-health';
import { notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import type { ItemProxy } from '../item';
import { Copyable, Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Trait } from './trait';

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
  get onboardALI() {
    const data = deepMerge(createEgoData(), this.epFlags?.onboardALI || {});
    const updater = new UpdateStore({
      getData: () => data,
      setData: this.updater.prop('flags', EP.Name, 'onboardALI').commit,
      isEditable: () => this.editable,
    });
    const items = new Map<string, ItemProxy>();
    const ops = setupItemOperations(updater.prop('items').commit);
    for (const itemData of data.items) {
      if (itemData.type === ItemType.Trait) {
        const trait = new Trait({
          lockSource: true,
          embedded: data.name,
          data: itemData,
          updater: new UpdateStore({
            getData: () => itemData,
            setData: (changed) => ops.update({ ...changed, _id: itemData._id }),
            isEditable: () => updater.editable,
          }),
        });
        items.set(trait.id, trait);
      }
    }

    return new Ego({
      data,
      updater,
      activeEffects: null,
      actor: null,
      items,
      itemOperations: ops,
    });
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
      deathRating: true,
    });
  }

  @LazyGetter()
  get firewallHealth() {
    return new AppMeshHealth({
      data: this.epData.firewallHealth,
      updater: this.updater.prop('data', 'firewallHealth').nestedStore(),
      source: `${localize('firewall')} (${this.epData.firewallRating})`,
    });
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
