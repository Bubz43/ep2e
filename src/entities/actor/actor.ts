import { canViewActor } from "@src/foundry/misc-helpers";
import { SystemSocketData, emitEPSocket } from "@src/foundry/socket";
import { pipe, map, compact, flatMap, forEach, reject } from "remeda";
import type { SetRequired } from "type-fest";
import type { DeepPartial } from "utility-types";
import { ActorType } from "../entity-types";
import type { ItemEP } from "../item/item";
import type { ActorDatas, ItemEntity } from "../models";
import { UpdateStore } from "../update-store";
import { EntitySubscription, Subscribable } from "../update-subcriptions";

type ItemUpdate = SetRequired<DeepPartial<ItemEntity>, "_id">;

export type ItemOperations = {
  add: (
    ...itemDatas: SetRequired<DeepPartial<ItemEntity>, "type" | "name">[]
  ) => Promise<ItemEP[]>;
  update: (...itemDatas: ItemUpdate[]) => Promise<unknown>;
  remove: (...itemIds: string[]) => Promise<unknown>;
};

export class ActorEP extends Actor { 
  readonly token?: Token;
  readonly #subscribers = new EntitySubscription<this>();
  readonly items?: Collection<ItemEP>;
  readonly effects!: Collection<ActiveEffect>
  itemTrash: ItemEP["data"][] = [];

  // #agent?: ActorProxy;
  #updater?: UpdateStore<ActorDatas>;
  // #identifiers?: ActorIdentifiers;
  #itemOperations?: ItemOperations;

  data!: ActorDatas;
  private invalidated = true;

  get updater() {
    if (!this.#updater)
      this.#updater = new UpdateStore({
        getData: () => this.data,
        isEditable: () => !!this.owner && !this.compendium?.locked,
        setData: (changedData) => this.update(changedData, {}),
      });
    return this.#updater;
  }

  get isToken() {
    return super.isToken as boolean;
  }

  get canView() {
    return canViewActor(this);
  }

  private emitItemSocket(
    change: Pick<SystemSocketData["itemChange"], "itemIds" | "type">
  ) {
    const { isToken, token } = this;
    if (isToken && token?.scene?.id) {
      emitEPSocket(
        {
          itemChange: {
            tokenId: token.id,
            sceneId: token.scene.id,
            ...change,
          },
        },
        true
      );
    } else if (!isToken) {
      emitEPSocket({ itemChange: { actorId: this.id, ...change } }, true);
    }
  }

  get itemOperations() {
    if (!this.#itemOperations) {
      this.#itemOperations = {
        add: async (...itemDatas) => {
          await this.createOwnedItem(itemDatas);
          const added = pipe(
            this.data.items.slice(-itemDatas.length),
            map(({ _id }) => this.items?.get(_id)),
            compact
          );
          this.emitItemSocket({
            type: "add",
            itemIds: added.map(({ id }) => id),
          });
          return added;
        },
        update: (...itemDatas) => {
          const itemIds: string[] = [];
          for (const { _id } of itemDatas) {
            this.items?.get(_id)?.invalidate();
            itemIds.push(_id);
          }
          this.emitItemSocket({ itemIds, type: "update" });
          return this.updateOwnedItem(itemDatas);
        },
        remove: async (...itemIds) => {
          this.emitItemSocket({ type: "remove", itemIds });
          pipe(
            itemIds,
            flatMap((id) => this.getOwnedItem(id) || []),
            forEach((item) => {
              this.itemTrash.push(item.dataCopy());
              item?._onDelete({}, game.user.id);
            })
          );

          if (this.agent.type === ActorType.Character) {
            const { favoriteItemIds: favoriteItems } = this.agent;
            const favs = reject(favoriteItems, (fav) => itemIds.includes(fav));
            if (favs.length !== favoriteItems.length) {
              await this.agent.updater
                .prop("data", "favoriteItems")
                .commit(favs);
            }
          }

          return this.deleteOwnedItem(itemIds);
        },
      };
    }
    return this.#itemOperations;
  }

  get subscriptions() {
    return this.#subscribers as Subscribable<this>;
  }

  get isTokenTemplate() {
    return !this.isToken && this.data.token.actorLink === false;
  }

  get id() {
    return this.data._id;
  }

  get type() {
    return this.data.type;
  }

  // get proxy() {
  //   if (!this.#agent || this.invalidated) {
  //     console.time("Create actor agent");
  //     const agent = this.createAgent();
  //     console.timeEnd("Create actor agent");
  //     this.#agent = agent;
  //   }
  //   this.invalidated = false;
  //   return this.#agent;
  // }
}
