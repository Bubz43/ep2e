import { LazyGetter } from 'lazy-get-decorator';
import type { Mutable, RequireAtLeastOne } from 'type-fest';
import type { ActorEP } from '../actor/actor';
import { ItemType, ActorType } from '../entity-types';
import type { ItemDatas } from '../models';
import { UpdateStore } from '../update-store';
import { EntitySubscription, Subscribable } from '../update-subcriptions';
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

type Operations = {
  openForm?: () => void;
  deleteSelf?: () => void;
};

export type ItemProxy = ReturnType<ItemEP['createProxy']>;

export type RangedWeapon =
  | BeamWeapon
  | Railgun
  | Firearm
  | SprayWeapon
  | SeekerWeapon;

export type EquippableItem =
  | Armor
  | Software
  | MeleeWeapon
  | PhysicalTech
  | RangedWeapon;

export type CopyableItem =
  | Substance
  | Armor
  | Explosive
  | MeleeWeapon
  | PhysicalTech
  | RangedWeapon
  | FirearmAmmo
  | ThrownWeapon;

export type InventoryItem =
  | Armor
  | Software
  | Explosive
  | Substance
  | MeleeWeapon
  | PhysicalTech
  | RangedWeapon
  | FirearmAmmo
  | ThrownWeapon;

export class ItemEP extends Item {
  private invalidated = true;
  readonly _subscribers = new EntitySubscription<this>();
  private _proxy?: ItemProxy;

  invalidate() {
    this.invalidated = true;
  }

  get actor(): ActorEP | null {
    return super.actor;
  }

  get subscriptions() {
    return this._subscribers as Subscribable<this>;
  }

  @LazyGetter()
  get updater() {
    return new UpdateStore({
      getData: () => this.data,
      isEditable: () =>
        !!this.owner &&
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
    return duplicate(this.data) as Mutable<ItemDatas>;
  }

  get id() {
    return this.data._id;
  }

  get type() {
    return this.data.type;
  }

  get proxy() {
    if (!this._proxy || this.invalidated) this._proxy = this.createProxy();

    this.invalidated = false;
    return this._proxy;
  }

  private createProxy() {
    const { data, actor } = this;
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
        return new Railgun(this.proxyInit(data));

      case ItemType.Firearm:
        return new Firearm(this.proxyInit(data));

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
      updater: (this.updater as unknown) as UpdateStore<T>,
      embedded: this.actor?.name,
      ...this.operations,
      // actorIdentifiers: this.actor?.identifiers,
    } as const;
  }

  _onDelete(options: unknown, userId: string) {
    super._onDelete(options, userId);
    this._subscribers.unsubscribeAll();
  }

  matchRegexp(regex: RegExp) {
    return this.proxy.matchRegexp(regex)
  }
}
