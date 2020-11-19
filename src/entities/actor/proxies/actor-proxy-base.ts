import {
  openWindow,
  closeWindow,
} from '@src/components/window/window-controls';
import { SlWindowEventName } from '@src/components/window/window-options';
import { EP } from '@src/foundry/system';
import type { ActorType } from '../../entity-types';
import type { ItemEP, ItemProxy } from '../../item/item';
import type { ActorEntity } from '../../models';
import type { UpdateStore } from '../../update-store';
import { ActorEP, ItemOperations } from '../actor';

export type ActorProxyInit<T extends ActorType> = {
  data: ActorEntity<T>;
  updater: UpdateStore<ActorEntity<T>>;
  items: Map<string, ItemProxy>;
  itemOperations: ItemOperations;
  actor: ActorEP;
};

export abstract class ActorProxyBase<T extends ActorType> {
  protected data: ActorEntity<T>;
  readonly updater: UpdateStore<ActorEntity<T>>;
  readonly items: Map<string, ItemProxy>;
  readonly itemOperations: ItemOperations;
  readonly actor: ActorEP;

  constructor({
    data,
    updater,
    items,
    itemOperations,
    actor,
  }: ActorProxyInit<T>) {
    this.data = data;
    this.updater = updater;
    this.items = items;
    this.itemOperations = itemOperations;
    this.actor = actor;
  }

  get itemTrash() {
    return this.actor.itemTrash;
  }

  protected get epData() {
    return this.data.data;
  }

  get epFlags() {
    return this.data.flags[EP.Name];
  }

  get id() {
    return this.data._id;
  }

  get name() {
    return this.data.name;
  }

  get type() {
    return this.data.type;
  }

  abstract get subtype(): string;

  get editable() {
    return this.updater.editable;
  }

  get img() {
    return this.data.img;
  }

  get disabled() {
    return !this.updater.editable;
  }

  get description() {
    return this.epData.description;
  }

  dataCopy() {
    return duplicate(this.data);
  }

  createActor() {
    // TODO: Replace temporary features
    return ActorEP.create({
      ...this.dataCopy(),
      items: [...this.items.values()].map((proxy) => proxy.getDataCopy(false)),
    });
  }

  hasItemProxy(agent: ItemProxy | null | undefined) {
    return !!agent && this.items.get(agent?.id) === agent;
  }

  protected get highestItemSort() {
    return [...this.items.values()].reduce(
      (accum, { sort }) => Math.max(accum, sort || 0),
      0,
    );
  }

  protected addLinkedWindow(
    updater: UpdateStore<any>,
    onViableUpdate: (actor: ActorEP) => boolean,
    {
      win,
      wasConnected,
    }: Pick<ReturnType<typeof openWindow>, 'win' | 'wasConnected'>,
  ) {
    const { actor } = this;
    actor.subscriptions.subscribe(updater, {
      onEntityUpdate: (actor) => {
        if (onViableUpdate(actor) === false) {
          actor.subscriptions.unsubscribe(updater);
        }
      },
      onSubEnd: () => closeWindow(updater),
    });
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => {
          actor.subscriptions.unsubscribe(updater);
          closeWindow(updater);
        },
        { once: true },
      );
    }
  }

  matchRegexp(regex: RegExp) {
    return [this.name, this.type].some((text) => regex.test(text));
  }
}
