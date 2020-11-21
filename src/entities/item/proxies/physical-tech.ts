import {
  closeWindow,
  getWindow,
  openOrRenderWindow
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName
} from '@src/components/window/window-options';
import { Activation, DeviceType } from '@src/data-enums';
import { Ego } from '@src/entities/actor/ego';
import type { ObtainableEffects } from '@src/entities/applied-effects';
import { renderEgoForm } from '@src/entities/components/render-ego-form';
import { ItemType } from '@src/entities/entity-types';
import {
  DefaultEgos,

  setupItemOperations
} from '@src/entities/models';
import { UpdateStore } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import { deepMerge } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { AppMeshHealth } from '@src/health/app-mesh-health';
import { MeshHealth } from '@src/health/full-mesh-health';
import { notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { createPipe, forEach, merge } from 'remeda';
import type { ItemProxy } from '../item';
import { Copyable, Equippable, Gear, Purchasable } from '../item-mixins';
import { renderItemForm } from '../item-views';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Trait } from './trait';

class Base extends ItemProxyBase<ItemType.PhysicalTech> {}
export class PhysicalTech
  extends mix(Base).with(Purchasable, Gear, Equippable, Copyable)
  implements ObtainableEffects {
  private static aliItemWindows = new WeakMap<Function, Map<string, {}>>();

  private static aliItemInstances = new WeakMap<
    object,
    Map<string, ItemProxy>
  >();

  constructor(init: ItemProxyInit<ItemType.PhysicalTech>) {
    super(init);
    const aliWindow = getWindow(this.aliSetter);
    if (aliWindow?.isConnected) {
      if (this.hasOnboardALI) this.onboardALI.openForm?.();
      else closeWindow(this.aliSetter);
    }
    const { openEgoWindows } = this;
    if (notEmpty(openEgoWindows)) {
      const { items } = this.onboardALI;
      for (const [id, key] of openEgoWindows) {
        const item = items.get(id);
        if (item) item.openForm?.();
        else {
          closeWindow(key);
          openEgoWindows.delete(id);
        }
      }
    }
  }

  private get aliSetter() {
    return this.updater.prop('flags', EP.Name, 'onboardALI').commit;
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
    return this.hasToggleActivation && this.state.activated;
  }

  get activation() {
    return this.epData.activation;
  }

  get hasActivation() {
    return this.activation !== Activation.None;
  }

  get hasToggleActivation() {
    return this.activation === Activation.Toggle;
  }

  get effects() {
    return this.epData.passiveEffects;
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

  get activationAction() {
    return this.epData.activationAction;
  }

  get hasUseActivation() {
    return this.activation === Activation.Use;
  }

  get hasMeshHealth() {
    return !!this.deviceType;
  }

  get hasOnboardALI() {
    return !!this.deviceType && this.epData.onboardALI;
  }

  private get openEgoWindows() {
    return PhysicalTech.aliItemWindows.get(this.aliSetter);
  }

  @LazyGetter()
  get onboardALI() {
    const egoData = this.epFlags?.onboardALI
      ? deepMerge(DefaultEgos.ali, this.epFlags?.onboardALI ?? {})
      : DefaultEgos.ali;
    const updater = new UpdateStore({
      getData: () => egoData,
      setData: this.aliSetter,
      isEditable: () => this.editable,
    });
    let items = PhysicalTech.aliItemInstances.get(this.updater);
    if (!items) {
      items = new Map();
      PhysicalTech.aliItemInstances.set(this.updater, items);
    }
    const beforeOp = forEach<string>((id) => {
      PhysicalTech.aliItemInstances.get(this.updater)?.delete(id);
    });
    const ops = setupItemOperations(updater.prop('items').commit, {
      update: beforeOp,
      remove: beforeOp,
    });

    const ego = new Ego({
      data: egoData,
      updater,
      activeEffects: null,
      actor: null,
      items,
      itemOperations: ops,
      allowSleights: false,
      openForm: () => {
        openOrRenderWindow({
          key: this.aliSetter,
          content: renderEgoForm(ego),
          resizable: ResizeOption.Vertical,
          name: `[${this.name} ${localize('onboardALI')}] ${ego.name}`,
        });
      },
    });

    for (const itemData of egoData.items) {
      const { _id } = itemData;
      if (items.has(_id)) continue;
      if (itemData.type === ItemType.Trait) {
        const trait = new Trait({
          data: itemData,
          embedded: this.name,
          lockSource: false,
          alwaysDeletable: this.editable,
          deleteSelf: () => ops.remove(itemData._id),
          updater: new UpdateStore({
            getData: () => itemData,
            isEditable: () => this.editable,
            setData: createPipe(merge({ _id: itemData._id }), ops.update),
          }),
          openForm: () => this.openEgoItemForm(_id),
        });
        items.set(trait.id, trait);
      }
    }

    return ego;
  }

  private openEgoItemForm(id: string) {
    const item = this.onboardALI.items.get(id);
    if (!item) return;
    let { openEgoWindows } = this;
    if (!openEgoWindows) {
      openEgoWindows = new Map();
      PhysicalTech.aliItemWindows.set(this.aliSetter, openEgoWindows);
    }
    let key = openEgoWindows.get(id);
    if (!key) {
      key = {};
      openEgoWindows.set(id, key);
    }
    const { win, wasConnected } = openOrRenderWindow({
      key,
      content: renderItemForm(item),
      name: `[${this.onboardALI.name}] ${item.fullName}`,
      resizable: ResizeOption.Vertical,
    });
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => this.openEgoWindows?.delete(id),
        { once: true },
      );
    }
  }

  onDelete() {
    closeWindow(this.aliSetter);
    const wins = this.openEgoWindows;
    wins?.forEach(closeWindow);
    PhysicalTech.aliItemWindows.delete(this.aliSetter);
    super.onDelete();
  }

  @LazyGetter()
  get effectGroups() {
    const { effects, activatedEffects, hasActivation } = this;
    const group = new Map<'passive' | 'activated', typeof effects>();
    if (notEmpty(effects)) group.set('passive', effects);
    if (hasActivation && notEmpty(activatedEffects))
      group.set('activated', activatedEffects);
    return group;
  }

  @LazyGetter()
  get currentEffects() {
    const { activated } = this;
    return {
      source: `${this.name} ${activated ? `(${localize('activated')})` : ''}`,
      effects: activated ? this.effects : this.activatedEffects,
    };
  }

  @LazyGetter()
  get meshHealth() {
    return new MeshHealth({
      data: this.epData.meshHealth,
      statMods: undefined,
      updater: this.updater.prop('data', 'meshHealth').nestedStore(),
      source: localize('mindState'),
      homeDevices: 1,
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
