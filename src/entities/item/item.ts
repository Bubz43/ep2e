import type { Mutable } from "type-fest";
import type { ActorEP } from "../actor/actor";
import { ItemType, ActorType } from "../entity-types";
import type { ItemDatas } from "../models";
import { UpdateStore } from "../update-store";
import { EntitySubscription, Subscribable } from "../update-subcriptions";
import { ItemEPSheet } from "./item-sheet";
import { Armor } from "./proxies/armor";
import { BeamWeapon } from "./proxies/beam-weapon";
import { Explosive } from "./proxies/explosive";
import { Firearm } from "./proxies/firearm";
import { FirearmAmmo } from "./proxies/firearm-ammo";
import { MeleeWeapon } from "./proxies/melee-weapon";
import { PhysicalService } from "./proxies/physical-service";
import { PhysicalTech } from "./proxies/physical-tech";
import { Psi } from "./proxies/psi";
import { Railgun } from "./proxies/railgun";
import { SeekerWeapon } from "./proxies/seeker-weapon";
import { Sleight } from "./proxies/sleight";
import { Software } from "./proxies/software";
import { SprayWeapon } from "./proxies/spray-weapon";
import { Substance } from "./proxies/substance";
import { ThrownWeapon } from "./proxies/thrown-weapon";
import { Trait } from "./proxies/trait";

type Operations = {
  openForm?: () => void;
  deleteSelf?: () => void;
};

export type ItemProxy = ReturnType<ItemEP["createAgent"]>

export class ItemEP extends Item {
  data!: ItemDatas;
  private invalidated = true;
  readonly #subscribers = new EntitySubscription<this>();
  #updater?: UpdateStore<ItemDatas>;
  #agent?: ItemProxy;
  #operations?: Operations;

  invalidate() {
    this.invalidated = true;
  }

  get actor(): ActorEP | null {
    return super.actor;
  }

  get subscriptions() {
    return this.#subscribers as Subscribable<this>;
  }

  get updater() {
    if (!this.#updater) {
      this.#updater = new UpdateStore({
        getData: () => this.data,
        isEditable: () => !!this.owner && !this.compendium?.locked,
        setData: (changedData) =>
          this.actor
            ? this.actor.itemOperations.update({ ...changedData, _id: this.id })
            : this.update(changedData, {}),
      });
    }
    return this.#updater;
  }

  private agentInit<T extends ItemDatas>(data: T) {
    return {
      data,
      updater: (this.updater as unknown) as UpdateStore<T>,
      embedded: this.actor?.name,
      ...this.operations,
      // actorIdentifiers: this.actor?.identifiers,
    } as const;
  }

  get sheet() {
    for (const [subscriber] of this.subscriptions.subs) {
      if (subscriber instanceof ItemEPSheet) {
        return subscriber
      }
    }
    return null;
  }

  get operations() {
    if (!this.#operations) {
      this.#operations = {
        openForm: () => this.sheet?.render(true),
        deleteSelf: () =>
          this.actor?.itemOperations.remove(this.id) ?? this.delete({}),
      };
    }
    return this.#operations;
  }

  prepareData() {
    super.prepareData();
    if (!this.actor) this.invalidate();
  }

  render(force: boolean, context: Record<string, unknown>) {
    this.#subscribers.updateSubscribers(this);
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

  get agent() {
    if (!this.#agent || this.invalidated) this.#agent = this.createAgent();

    this.invalidated = false;
    return this.#agent;
  }




  private createAgent() {
    const { data, actor } = this;
    switch (data.type) {
      case ItemType.Trait:
        return new Trait({
          ...this.agentInit(data),
          lockSource: actor ? actor.type !== ActorType.Character : false,
        });

      case ItemType.Psi:
        return new Psi(this.agentInit(data));

      case ItemType.Sleight:
        return new Sleight(this.agentInit(data));

      case ItemType.Substance:
        return new Substance({...this.agentInit(data), loaded: false });

      case ItemType.Armor:
        return new Armor(this.agentInit(data));

      case ItemType.Explosive:
        return new Explosive({ ...this.agentInit(data), loaded: false });

      case ItemType.Software:
        return new Software(this.agentInit(data));

      case ItemType.MeleeWeapon:
        return new MeleeWeapon(this.agentInit(data));

      case ItemType.PhysicalTech:
        return new PhysicalTech(this.agentInit(data));

      case ItemType.BeamWeapon:
        return new BeamWeapon(this.agentInit(data));

      case ItemType.Railgun:
        return new Railgun(this.agentInit(data));

      case ItemType.Firearm:
        return new Firearm(this.agentInit(data));

      case ItemType.FirearmAmmo:
        return new FirearmAmmo({ ...this.agentInit(data), loaded: false });

      case ItemType.PhysicalService:
        return new PhysicalService(this.agentInit(data));

      case ItemType.SprayWeapon:
        return new SprayWeapon(this.agentInit(data));

      case ItemType.SeekerWeapon:
        return new SeekerWeapon(this.agentInit(data));

      case ItemType.ThrownWeapon:
        return new ThrownWeapon(this.agentInit(data));
    }
  }


  _onDelete(options: unknown, userId: string) {
    super._onDelete(options, userId);
    this.#subscribers.unsubscribeAll();
  }

}
