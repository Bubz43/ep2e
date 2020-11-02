import type { ActorEP } from "./actor";
import type { ItemDatas } from "./models";
import type { UpdateStore } from "./update-store";
import { EntitySubscription } from "./update-subcriptions";

type Operations = {
  openForm?: () => void;
  deleteSelf?: () => void;
};

export class ItemEP extends Item {
  data!: ItemDatas;
  private invalidated = true;
  readonly #subscribers = new EntitySubscription<this>();
  #updater?: UpdateStore<ItemDatas>;
  // #proxy?: ItemProxy;
  #operations?: Operations;

  invalidate() {
    this.invalidated = true;
  }

  get actor(): ActorEP | null {
    return super.actor;
  }

  // get updater() {
  //   if (!this.#updater) {
  //     this.#updater = new UpdateStore({
  //       getData: () => this.data,
  //       isEditable: () => !!this.owner && !this.compendium?.locked,
  //       setData: (changedData) =>
  //         this.actor
  //           ? this.actor.itemOperations.update({ ...changedData, _id: this.id })
  //           : this.update(changedData, {}),
  //     });
  //   }
  //   return this.#updater;
  // }
}
