import {
  closeWindow,
  getWindow,
  openOrRenderWindow
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName
} from '@src/components/window/window-options';
import { Activation, DeviceType, FabType } from '@src/data-enums';
import { Ego } from '@src/entities/actor/ego';
import type { ObtainableEffects } from '@src/entities/applied-effects';
import { renderEgoForm } from '@src/entities/components/render-ego-form';
import { ItemType } from '@src/entities/entity-types';
import {
  DefaultEgos,
  ItemEntity,
  setupItemOperations
} from '@src/entities/models';
import { UpdateStore } from '@src/entities/update-store';
import { acquisitionTime } from '@src/features/complexity';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import {
  CommonInterval,
  createLiveTimeState,
  currentWorldTimeMS,

  LiveTimeState
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { deepMerge } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { AppMeshHealth } from '@src/health/app-mesh-health';
import { MeshHealth } from '@src/health/full-mesh-health';
import { notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { createPipe, forEach, merge } from 'remeda';
import type { CopyableItem, ItemProxy } from '../item';
import { Copyable, Equippable, Gear, Purchasable } from '../item-mixins';
import { renderItemForm } from '../item-views';
import { Armor } from './armor';
import { BeamWeapon } from './beam-weapon';
import { Explosive } from './explosive';
import { Firearm } from './firearm';
import { FirearmAmmo } from './firearm-ammo';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { MeleeWeapon } from './melee-weapon';
import { Railgun } from './railgun';
import { SeekerWeapon } from './seeker-weapon';
import { SprayWeapon } from './spray-weapon';
import { Substance } from './substance';
import { ThrownWeapon } from './thrown-weapon';
import { Trait } from './trait';

class Base extends ItemProxyBase<ItemType.PhysicalTech> {
  get updateState() {
    return this.updater.prop('data', 'state');
  }
}
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

  get fullName() {
    return this.isActiveFabber
      ? `${this.name} [${this.fabricatedItem?.name}]`
      : this.name;
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

  toggleActivation() {
    return this.updateState.commit({ activated: !this.activated });
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

  get fabricatorType() {
    return this.epData.fabricator;
  }

  get disableFabTypeChange() {
    switch (this.fabricatorType) {
      case FabType.Gland:
        return !!this.glandedSubstance;

      case FabType.General:
      case FabType.Specialized:
        return !!this.itemBlueprint;

      default:
        return false;
    }
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
    const { hasToggleActivation, activated } = this;
    return {
      source: `${this.name} ${activated ? `(${localize('activated')})` : ''}`,
      effects:
        hasToggleActivation && activated ? this.activatedEffects : this.effects,
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

  @LazyGetter()
  get glandedSubstance() {
    const substance = this.epFlags?.gland?.[0];
    return (
      substance &&
      new Substance({
        loaded: true,
        data: substance,
        embedded: this.name,
        deleteSelf: () => this.glandCommiter(null),
      })
    );
  }

  addSubstanceToGland(substance: Substance) {
    this.glandCommiter([substance.getDataCopy(true)]);
  }

  private get glandCommiter() {
    return this.updater.prop('flags', EP.Name, 'gland').commit;
  }

  @LazyGetter()
  get itemBlueprint() {
    const data = this.epFlags?.blueprint?.[0];
    const init = <T extends ItemType>(data: ItemEntity<T>) => ({
      data,
      loaded: true,
      embedded: this.name,
      deleteSelf: () => this.itemBlueprintCommiter(null),
    });
    if (!data) return null;
    switch (data.type) {
      case ItemType.Armor:
        return new Armor(init(data));
      case ItemType.PhysicalTech:
        return new PhysicalTech(init(data));
      case ItemType.Substance:
        return new Substance(init(data));
      case ItemType.Explosive:
        return new Explosive(init(data));
      case ItemType.BeamWeapon:
        return new BeamWeapon(init(data));
      case ItemType.Railgun:
        return new Railgun({ ...init(data), nestedShape: false });
      case ItemType.Firearm:
        return new Firearm({ ...init(data), nestedShape: false });
      case ItemType.FirearmAmmo:
        return new FirearmAmmo(init(data));
      case ItemType.SprayWeapon:
        return new SprayWeapon(init(data));
      case ItemType.SeekerWeapon:
        return new SeekerWeapon(init(data));
      case ItemType.MeleeWeapon:
        return new MeleeWeapon(init(data));
      case ItemType.ThrownWeapon:
        return new ThrownWeapon(init(data));
    }
  }

  get fabricatedItem() {
    return this.fabricatorType === FabType.Gland
      ? this.glandedSubstance
      : this.fabricatorType
      ? this.itemBlueprint
      : null;
  }

  get printDuration() {
    const { fabPrintDuration } = this.epData;
    return this.fabricatorType === FabType.Gland
      ? fabPrintDuration || toMilliseconds({ hours: 4 })
      : this.fabricatedItem
      ? acquisitionTime[this.fabricatedItem.cost.complexity]
      : CommonInterval.Turn;
  }

  get isActiveFabber() {
    return this.fabricatorType && !!this.fabricatedItem;
  }

  @LazyGetter()
  get printState(): LiveTimeState {
    return createLiveTimeState({
      duration: this.printDuration,
      img: this.fabricatedItem?.nonDefaultImg,
      id: `${this.type}-${this.id}`,
      label: this.fullName,
      startTime: this.state.fabStartTime,
      updateStartTime: this.updater.prop('data', 'state', 'fabStartTime')
        .commit,
    });
  }

  addItemBlueprint(blueprint: CopyableItem) {
    // TODO set print time based off complexity
    this.itemBlueprintCommiter([blueprint.getDataCopy(true)]);
  }

  private get itemBlueprintCommiter() {
    return this.updater.prop('flags', EP.Name, 'blueprint').commit;
  }

  getDataCopy(reset = false) {
    const copy = super.getDataCopy(reset);
    copy.data.state = {
      fabStartTime: currentWorldTimeMS(),
      equipped: false,
      disabled: false,
      activated: false,
      embeddedEgos: [],
      onboardAliDeleted: false,
    };
    return copy;
  }
}
