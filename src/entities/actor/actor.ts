import type { EntitySheet, TokenData } from '@src/foundry/foundry-cont';
import { canViewActor } from '@src/foundry/misc-helpers';
import { SystemSocketData, emitEPSocket } from '@src/foundry/socket';
import { EP } from '@src/foundry/system';
import { pipe, map, compact, flatMap, forEach, reject } from 'remeda';
import type { SetRequired } from 'type-fest';
import type { DeepPartial } from 'utility-types';
import { ActorType, ItemType, sleeveTypes } from '../entity-types';
import type { ItemEP } from '../item/item';
import type {
  ActorDatas,
  ActorEntity,
  ActorModels,
  ItemEntity,
  NonEditableProps,
} from '../models';
import { UpdateStore } from '../update-store';
import { EntitySubscription, Subscribable } from '../update-subcriptions';
import { ActorEPSheet } from './actor-sheet';
import type { ActorProxyInit } from './proxies/actor-proxy-base';
import { Biological } from './proxies/biological';
import { Character } from './proxies/character';
import { Infomorph } from './proxies/infomorph';
import { SyntheticShell } from './proxies/synthetic-shell';

type ItemUpdate = SetRequired<DeepPartial<ItemEntity>, '_id'>;

export type ItemOperations = {
  add: (
    ...itemDatas: SetRequired<DeepPartial<ItemEntity>, 'type' | 'name'>[]
  ) => Promise<ItemEP[]>;
  update: (...itemDatas: ItemUpdate[]) => Promise<unknown>;
  remove: (...itemIds: string[]) => Promise<unknown>;
};

export type ActorProxy = ReturnType<ActorEP['createProxy']>;

export type MaybeToken = Token | null | undefined;

export class ActorEP extends Actor {
  readonly #subscribers = new EntitySubscription<this>();
  itemTrash: ItemEP['data'][] = [];

  #proxy?: ActorProxy;
  #updater?: UpdateStore<ActorDatas>;
  // #identifiers?: ActorIdentifiers;
  #itemOperations?: ItemOperations;

  private invalidated = true;

  get updater() {
    if (!this.#updater)
      this.#updater = new UpdateStore({
        getData: () => this.data,
        isEditable: () => this.editable,
        setData: (changedData) => this.update(changedData, {}),
      });
    return this.#updater;
  }

  get editable() {
    return this.owner && (!this.compendium || !this.compendium.locked);
  }

  get isToken() {
    return super.isToken as boolean;
  }

  get canView() {
    return canViewActor(this);
  }

  private emitItemSocket(
    change: Pick<SystemSocketData['itemChange'], 'itemIds' | 'type'>,
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
        true,
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
            compact,
          );
          this.emitItemSocket({
            type: 'add',
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
          this.emitItemSocket({ itemIds, type: 'update' });
          return this.updateOwnedItem(itemDatas);
        },
        remove: async (...itemIds) => {
          this.emitItemSocket({ type: 'remove', itemIds });
          pipe(
            itemIds,
            flatMap((id) => this.getOwnedItem(id) || []),
            forEach((item) => {
              this.itemTrash.push(item.dataCopy());
              item?._onDelete({}, game.user.id);
            }),
          );

          // if (this.agent.type === ActorType.Character) {
          //   const { favoriteItemIds: favoriteItems } = this.agent;
          //   const favs = reject(favoriteItems, (fav) => itemIds.includes(fav));
          //   if (favs.length !== favoriteItems.length) {
          //     await this.agent.updater
          //       .prop('data', 'favoriteItems')
          //       .commit(favs);
          //   }
          // }

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

  get agent() {
    if (!this.#proxy || this.invalidated) {
      console.time('Create actor proxy');
      const agent = this.createProxy();
      console.timeEnd('Create actor proxy');
      this.#proxy = agent;
    }
    this.invalidated = false;
    return this.#proxy;
  }

  private createProxy() {
    const { data } = this;

    switch (data.type) {
      case ActorType.Character:
        return new Character(this.proxyInit(data));

      case ActorType.Biological:
        return new Biological(this.proxyInit(data));

      case ActorType.SyntheticShell:
        return new SyntheticShell(this.proxyInit(data));

      case ActorType.Infomorph:
        return new Infomorph(this.proxyInit(data));
    }
  }

  private proxyInit<T extends ActorType>(
    data: ActorEntity<T>,
  ): ActorProxyInit<T> {
    return {
      data,
      updater: (this.updater as unknown) as UpdateStore<typeof data>,
      items: this.items || new Collection<ItemEP>(),
      itemOperations: this.itemOperations,
      actor: this,
    } as const;
  }

  getActiveTokens(linked?: boolean) {
    return super.getActiveTokens(linked) as Token[];
  }

  prepareData() {
    super.prepareData();
    this.invalidated = true;
  }

  render(force: boolean, context: Record<string, unknown>) {
    this.#subscribers.updateSubscribers(this);
    super.render(force, context);
  }

  _onDelete(options: unknown, userId: string) {
    super._onDelete(options, userId);
    this.items?.forEach((item) => item.sheet?.close());
    this.#subscribers.unsubscribeAll();
  }

  get conditions() {
    if (this.data.type === ActorType.Character) {
      const epFlag = this.data.flags[EP.Name] || {};
      for (const sleeveType of sleeveTypes) {
        const sleeveData = epFlag[sleeveType];
        if (sleeveData) return sleeveData.data.conditions;
      }
    } else return this.data.data.conditions;
    return [];
  }

  get sheet() {
    for (const [subscriber] of this.subscriptions.subs) {
      if (subscriber instanceof ActorEPSheet) {
        return subscriber;
      }
    }

    return new ActorEPSheet(this);
  }

  getOwnedItem(id: string | null) {
    return super.getOwnedItem(id) as ItemEP | null;
  }

  async createOwnedItem<T extends ItemType>(
    itemData: SetRequired<DeepPartial<ItemEntity<T>>, 'type' | 'name'>,
    options?: unknown,
  ): Promise<ItemEntity<T> | null>;

  async createOwnedItem<
    T extends SetRequired<DeepPartial<ItemEntity>, 'type' | 'name'>
  >(itemDatas: T[], options?: unknown): Promise<ItemEntity[] | null>;

  async createOwnedItem<
    D extends SetRequired<DeepPartial<ItemEntity>, 'name' | 'type'>
  >(itemData: D | D[], options = {}) {
    return super.createOwnedItem(itemData, options);
  }

  // TODO: These types are pretty wonky, look into better solution
  static async create<T extends ActorType>(
    data: Omit<
      SetRequired<Partial<ActorEntity<T>>, 'type' | 'name'>,
      'data' | 'token'
    > & { data?: Partial<ActorModels[T]>; token?: Partial<TokenData> },
    options?: { temporary?: boolean; renderSheet?: boolean },
  ): Promise<ActorEP>;

  static async create<
    D extends SetRequired<DeepPartial<ActorEntity>, 'type' | 'name'>[]
  >(
    data: D,
    options?: { temporary?: boolean; renderSheet?: boolean },
  ): Promise<ActorEP[]>;

  static async create<
    D extends SetRequired<DeepPartial<ActorEntity>, 'type' | 'name'>
  >(
    data: D | D[],
    options: { temporary?: boolean; renderSheet?: boolean } = {},
  ) {
    return super.create(data, options);
  }
}
