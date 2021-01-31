import type { EntitySheet, TokenData } from '@src/foundry/foundry-cont';
import { localize } from '@src/foundry/localization';
import { canViewActor } from '@src/foundry/misc-helpers';
import { readyCanvas } from '@src/foundry/canvas';
import { SystemSocketData, emitEPSocket } from '@src/foundry/socket';
import { EP } from '@src/foundry/system';
import { pipe, map, compact, flatMap, forEach, reject } from 'remeda';
import type { SetRequired } from 'type-fest';
import type { DeepPartial } from 'utility-types';
import { ActorType, ItemType, sleeveTypes } from '../entity-types';
import type { ActorIdentifiers } from '../find-entities';
import type { ItemEP } from '../item/item';
import type {
  ActorDatas,
  ActorEntity,
  ActorModels,
  ItemEntity,
  NonEditableProps,
} from '../models';
import { UpdateStore } from '../update-store';
import { EntitySubscription } from '../update-subcriptions';
import { ActorEPSheet } from './actor-sheet';
import type { ActorProxyInit } from './proxies/actor-proxy-base';
import { Biological } from './proxies/biological';
import { Character } from './proxies/character';
import { Infomorph } from './proxies/infomorph';
import { Synthetic } from './proxies/synthetic';
import type { EntityPath } from '../path';
import { subscribeToToken } from '../subscriptions';

type ItemUpdate = SetRequired<DeepPartial<ItemEntity>, '_id'>;

export type ItemOperations = {
  add: (
    ...itemDatas: SetRequired<DeepPartial<ItemEntity>, 'type' | 'name'>[]
  ) => Promise<string[]>;
  update: (...itemDatas: ItemUpdate[]) => Promise<string[]>;
  remove: (...itemIds: string[]) => Promise<string[]>;
};

export type ActorProxy = ReturnType<ActorEP['createProxy']>;

export type MaybeToken = Token | null | undefined;

export type ActorSub = (data: ActorEP | null) => void;

export class ActorEP extends Actor {
  readonly #subscribers = new EntitySubscription<this>();
  itemTrash: ItemEP['data'][] = [];

  #proxy?: ActorProxy;
  #updater?: UpdateStore<ActorDatas>;
  // #identifiers?: ActorIdentifiers;
  #itemOperations?: ItemOperations;

  #path?: EntityPath;

  private declare invalidated: boolean;
  private declare hasPrepared: boolean;
  private readonly subs = new Set<ActorSub>();

  subscribe(sub: ActorSub) {
    if (this.token?.scene && this.isToken) {
      const tokenSub = subscribeToToken(
        {
          tokenId: this.token.id,
          sceneId: this.token.scene.id,
        },
        {
          next: (token) => sub(token.actor || null),
          complete: () => sub(null),
        },
      );
      return () => tokenSub?.unsubscribe();
    }
    this.subs.add(sub);
    sub(this);
    return () => void this.subs.delete(sub);
  }

  get identifiers(): ActorIdentifiers {
    return {
      actorId: this.id,
      tokenId: this.isToken && this.token?.id,
      sceneId: this.isToken && this.token?.scene?.id,
      uuid: this.uuid,
    };
  }

  get updater() {
    if (!this.#updater)
      this.#updater = new UpdateStore({
        getData: () => this.data,
        isEditable: () => this.editable,
        setData: (changedData) => this.update(changedData, {}),
      });
    return this.#updater;
  }

  get path() {
    if (!this.#path) {
      if (this.isToken && this.token) {
        if (!this.token.scene) this.#path = [];
        else {
          this.#path = [this.token.scene, this.token];
        }
      } else if (game.actors.has(this.id)) {
        this.#path = compact([
          { name: localize('actors') },
          this.folder && { name: this.folder.name },
          this,
        ]);
      } else this.#path = [];
    }
    return this.#path;
  }

  get editable() {
    // (!this.isToken || this.token?.scene?.id === activeCanvas()?.scene.id)
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
          const addedIDs = pipe(
            this.data.items.slice(-itemDatas.length),
            map(({ _id }) => _id),
            compact,
          );
          this.emitItemSocket({
            type: 'add',
            itemIds: addedIDs,
          });
          this.invalidated = true;

          return addedIDs;
        },
        update: async (...itemDatas) => {
          const itemIds: string[] = [];
          for (const { _id } of itemDatas) {
            this.items?.get(_id)?.invalidate();
            itemIds.push(_id);
          }
          this.emitItemSocket({ itemIds, type: 'update' });
          await this.updateOwnedItem(itemDatas);
          this.invalidated = true;
          return itemIds;
        },
        remove: async (...itemIds) => {
          this.emitItemSocket({ type: 'remove', itemIds });
          pipe(
            itemIds,
            flatMap((id) => this.getOwnedItem(id) || []),
            forEach((item) => {
              if (
                !(
                  item.proxy.type === ItemType.Substance &&
                  item.proxy.appliedState
                )
              ) {
                this.itemTrash.push(item.dataCopy());
              }

              item?._onDelete({}, game.user.id);
            }),
          );

          await this.deleteOwnedItem(itemIds);
          this.invalidated = true;
          return itemIds;
        },
      };
    }
    return this.#itemOperations;
  }

  get subscriptions() {
    return this.#subscribers;
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

  get tokenOrLocalInfo() {
    const token = this.isToken ? this.token : this.getActiveTokens(true)[0];
    return {
      img: token?.data.img || this.img,
      name: token?.name || this.name,
    };
  }

  get proxy() {
    if (!this.#proxy || this.invalidated) {
      console.time('Create actor proxy');
      const agent = this.createProxy();
      console.timeEnd('Create actor proxy');
      this.#proxy = agent;
    }
    this.invalidated = false;
    return this.#proxy;
  }

  private openForm = () => this.sheet.render(true);

  private createProxy() {
    const { data } = this;

    switch (data.type) {
      case ActorType.Character:
        return new Character(this.proxyInit(data));

      case ActorType.Biological:
        return new Biological(this.proxyInit(data));

      case ActorType.Synthetic:
        return new Synthetic(this.proxyInit(data));

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
      // TODO do this in this._prepareOwnedItems to avoid this additional iteration
      items: new Map(
        (this.items || new Collection<ItemEP>()).map(({ proxy }) => [
          proxy.id,
          proxy,
        ]),
      ),
      itemOperations: this.itemOperations,
      actor: this,
      openForm: this.openForm,
      path: this.path,
    } as const;
  }

  getActiveTokens(linked?: boolean) {
    return super.getActiveTokens(linked) as Token[];
  }

  prepareData() {
    super.prepareData();
    this.invalidated = true;
    if (this.hasPrepared)
      emitEPSocket({ actorChanged: this.identifiers }, true);
    else this.hasPrepared = true;

    this.subs?.forEach((sub) => sub(this));
  }

  render(force: boolean, context: Record<string, unknown>) {
    this.#subscribers.updateSubscribers(this);
    super.render(force, context);
  }

  _onDelete(options: unknown, userId: string) {
    super._onDelete(options, userId);
    this.items?.forEach((item) => item.sheet?.close());
    this.#subscribers.unsubscribeAll();
    this.subs.forEach((sub) => sub(null));
    this.subs.clear();
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

  matchRegexp(regex: RegExp) {
    return [this.name, localize(this.type)].some((text) => regex.test(text));
  }
}
