import type { TokenData } from '@src/foundry/foundry-cont';
import { localize } from '@src/foundry/localization';
import { canViewActor } from '@src/foundry/misc-helpers';
import { emitEPSocket, SystemSocketData } from '@src/foundry/socket';
import { EP } from '@src/foundry/system';
import { compact, flatMap, forEach, map, pipe } from 'remeda';
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
} from '../models';
import type { EntityPath } from '../path';
import { subscribeToToken } from '../token-subscription';
import { UpdateStore } from '../update-store';
import { EntitySubscription } from '../update-subcriptions';
import { ActorEPSheet, actorSheets } from './actor-sheet';
import type { ActorProxyInit } from './proxies/actor-proxy-base';
import { Biological } from './proxies/biological';
import { Character } from './proxies/character';
import { Infomorph } from './proxies/infomorph';
import { Synthetic } from './proxies/synthetic';
import { formattedSleeveInfo, Sleeve } from './sleeves';

type ItemUpdate = SetRequired<DeepPartial<ItemEntity>, '_id'>;

export type ItemOperations = {
  add: (
    ...itemDatas: SetRequired<DeepPartial<ItemEntity>, 'type' | 'name'>[]
  ) => Promise<string[]>;
  update: (...itemDatas: ItemUpdate[]) => Promise<string[]>;
  remove: (...itemIds: string[]) => Promise<string[]>;
};

export type ActorProxy = Character | Sleeve;

export type MaybeToken = TokenDocument | null | undefined;

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
    const token = this.isToken ? this.token : null;
    return {
      actorId: this.id,
      tokenId: token?.id,
      sceneId: token?.scene?.id,
      uuid: this.uuid,
    };
  }

  get updater() {
    if (!this.#updater)
      this.#updater = new UpdateStore({
        getData: () => this.toJSON(),
        isEditable: () => this.editable,
        setData: (changedData) => this.update(changedData, {}),
      });
    return this.#updater;
  }

  get editable() {
    // (!this.isToken || this.token?.scene?.id === activeCanvas()?.scene.id)
    return this.isOwner && !this.compendium;
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
          const itemIDs = new Set(this.data.items.keys());
          await this.createEmbeddedDocuments('Item', itemDatas);
          const addedIDs = [...this.data.items.keys()].filter(
            (id) => !itemIDs.has(id),
          );
          this.emitItemSocket({
            type: 'add',
            itemIds: addedIDs,
          });
          this.invalidated = true;
          return addedIDs;
        },
        update: async (...itemDatas) => {
          await this.updateOwnedItem(itemDatas);

          const itemIds: string[] = [];
          for (const { _id } of itemDatas) {
            this.items?.get(_id)?.invalidate();
            itemIds.push(_id);
          }
          this.emitItemSocket({ itemIds, type: 'update' });

          this.invalidated = true;
          this.prepareData();
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
                this.itemTrash.push(item.dataCopy() as ItemEP['data']);
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

  get token() {
    return super.token as TokenDocument | null;
  }

  get isTokenTemplate() {
    return !this.isToken && this.data.token.actorLink === false;
  }

  get tokenOrLocalInfo() {
    const token = this.isToken ? this.token : this.getActiveTokens(true)[0];
    return {
      img: token?.data.img || this.img,
      name: token?.name || this.name,
      uuid: this.isToken ? this.token!.uuid : this.uuid,
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

  private createProxy(): ActorProxy {
    const data = this.toJSON();

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
      updater: this.updater as unknown as UpdateStore<typeof data>,
      items: new Map(
        [...(this.items?.values() || [])].map(({ proxy }) => [proxy.id, proxy]),
      ),
      itemOperations: this.itemOperations,
      actor: this,
      openForm: this.openForm,
    } as const;
  }

  getActiveTokens(linked?: boolean, document?: boolean) {
    return super.getActiveTokens(linked, document) as (Token | TokenDocument)[];
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
    const data = this.toJSON();
    if (data.type === ActorType.Character) {
      const epFlag = data.flags[EP.Name] || {};
      for (const sleeveType of sleeveTypes) {
        const sleeveData = epFlag[sleeveType];
        if (sleeveData) return sleeveData.data.conditions;
      }
    } else return data.data.conditions;
    return [];
  }

  get sheet() {
    return actorSheets.get(this) || new ActorEPSheet(this);
  }

  matchRegexp(regex: RegExp) {
    return this.proxy.type === ActorType.Character
      ? this.proxy.matchRegexp(regex)
      : [this.proxy.name, ...formattedSleeveInfo(this.proxy)].some((info) =>
          regex.test(info),
        );
  }
}

export async function createActor<
  D extends SetRequired<DeepPartial<ActorEntity>, 'type' | 'name'>,
>(data: D, options: { temporary?: boolean; renderSheet?: boolean } = {}) {
  return Actor.create(data, options) as Promise<ActorEP>;
}
