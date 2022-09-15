import type { RangedWeaponAccessory } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { LazyGetter } from 'lazy-get-decorator';
import type { Mutable } from 'type-fest';
import type { ActorEP } from '../actor/actor';
import { ActorType, ItemType } from '../entity-types';
import type { ItemDatas } from '../models';
import type { EntityPath } from '../path';
import { UpdateStore } from '../update-store';
import { EntitySubscription } from '../update-subcriptions';
import { ItemEPSheet } from './item-sheet';
import { Armor } from './proxies/armor';
import { BeamWeapon } from './proxies/beam-weapon';
import { Explosive } from './proxies/explosive';
import { Firearm } from './proxies/firearm';
import { FirearmAmmo } from './proxies/firearm-ammo';
import { MeleeWeapon } from './proxies/melee-weapon';
import { PhysicalService } from './proxies/physical-service';
import { PhysicalTech } from './proxies/physical-tech';
import { Psi } from './proxies/psi';
import { Railgun } from './proxies/railgun';
import { SeekerWeapon } from './proxies/seeker-weapon';
import { Sleight } from './proxies/sleight';
import { Software } from './proxies/software';
import { SprayWeapon } from './proxies/spray-weapon';
import { Substance } from './proxies/substance';
import { ThrownWeapon } from './proxies/thrown-weapon';
import { Trait } from './proxies/trait';

export type ItemProxy =
  | Trait
  | Substance
  | Psi
  | Sleight
  | Armor
  | Explosive
  | Software
  | MeleeWeapon
  | PhysicalTech
  | PhysicalService
  | Firearm
  | FirearmAmmo
  | Railgun
  | SeekerWeapon
  | SprayWeapon
  | ThrownWeapon
  | BeamWeapon;

export type ConsumableItem = Extract<ItemProxy, { quantity: number }>;
export type EquippableItem = Extract<ItemProxy, { equipped: boolean }>;
export type CopyableItem = Extract<ItemProxy, { isBlueprint: boolean }>;
export type RangedWeapon = Extract<
  ItemProxy,
  { accessories: RangedWeaponAccessory[] }
>;

export class ItemEP extends Item {
  private invalidated = true;
  readonly _subscribers = new EntitySubscription<this>();
  private _proxy?: ItemProxy;

  invalidate() {
    this.invalidated = true;
  }

  get actor() {
    return super.actor as ActorEP | null;
  }

  get subscriptions() {
    return this._subscribers;
  }

  @LazyGetter()
  get updater() {
    return new UpdateStore({
      getData: () => this.toJSON(),
      isEditable: () =>
        !!this.isOwner &&
        (this.actor ? this.actor.editable : true) &&
        !this.compendium?.locked,
      setData: (changedData) =>
        this.actor
          ? this.actor.itemOperations.update({ ...changedData, _id: this.id })
          : this.update(changedData, {}),
    });
  }

  get sheet() {
    for (const [subscriber] of this.subscriptions.subs) {
      if (subscriber instanceof ItemEPSheet) {
        return subscriber;
      }
    }
    return new ItemEPSheet(this);
  }

  @LazyGetter()
  get operations() {
    return {
      openForm: () => this.sheet?.render(true),
      deleteSelf: () =>
        this.actor?.itemOperations.remove(this.id) ?? this.delete({}),
    };
  }

  prepareData() {
    super.prepareData();
    if (!this.actor) this.invalidate();
  }

  render(force: boolean, context: Record<string, unknown>) {
    this._subscribers.updateSubscribers(this);
    super.render(force, context);
  }

  dataCopy() {
    return duplicate(this.toJSON()) as Mutable<ItemDatas>;
  }

  get proxy() {
    if (!this._proxy || this.invalidated) this._proxy = this.createProxy();

    this.invalidated = false;
    return this._proxy;
  }

  private createProxy() {
    const { actor } = this;
    const data = this.toJSON();
    switch (data.type) {
      case ItemType.Trait:
        return new Trait({
          ...this.proxyInit(data),
          lockSource: actor ? actor.type !== ActorType.Character : false,
        });

      case ItemType.Psi:
        return new Psi(this.proxyInit(data));

      case ItemType.Sleight:
        return new Sleight(this.proxyInit(data));

      case ItemType.Substance:
        return new Substance({ ...this.proxyInit(data), loaded: false });

      case ItemType.Armor:
        return new Armor(this.proxyInit(data));

      case ItemType.Explosive:
        return new Explosive({ ...this.proxyInit(data), loaded: false });

      case ItemType.Software:
        return new Software(this.proxyInit(data));

      case ItemType.MeleeWeapon:
        return new MeleeWeapon(this.proxyInit(data));

      case ItemType.PhysicalTech:
        return new PhysicalTech(this.proxyInit(data));

      case ItemType.BeamWeapon:
        return new BeamWeapon(this.proxyInit(data));

      case ItemType.Railgun:
        return new Railgun({ ...this.proxyInit(data), nestedShape: false });

      case ItemType.Firearm:
        return new Firearm({ ...this.proxyInit(data), nestedShape: false });

      case ItemType.FirearmAmmo:
        return new FirearmAmmo({ ...this.proxyInit(data), loaded: false });

      case ItemType.PhysicalService:
        return new PhysicalService(this.proxyInit(data));

      case ItemType.SprayWeapon:
        return new SprayWeapon(this.proxyInit(data));

      case ItemType.SeekerWeapon:
        return new SeekerWeapon(this.proxyInit(data));

      case ItemType.ThrownWeapon:
        return new ThrownWeapon(this.proxyInit(data));
    }
  }

  private proxyInit<T extends ItemDatas>(data: T) {
    return {
      data,
      updater: this.updater as unknown as UpdateStore<T>,
      embedded: this.actor?.name,
      actor: this.actor,
      uuid: this.uuid,
      ...this.operations,
      // actorIdentifiers: this.actor?.identifiers,
    } as const;
  }

  _onDelete(options: unknown, userId: string) {
    super._onDelete(options, userId);
    this._subscribers.unsubscribeAll();
    this.proxy.onDelete();
  }

  matchRegexp(regex: RegExp) {
    return this.proxy.matchRegexp(regex);
  }
}
