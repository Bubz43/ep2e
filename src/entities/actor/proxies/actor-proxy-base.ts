import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import { SlWindowEventName } from '@src/components/window/window-options';
import type { EntityPath } from '@src/entities/path';
import { EP } from '@src/foundry/system';
import type { ActorType } from '../../entity-types';
import type { ItemProxy } from '../../item/item';
import type { ActorEntity, ActorModels } from '../../models';
import type { UpdateStore } from '../../update-store';
import { ActorEP, ItemOperations } from '../actor';

export type ActorProxyInit<T extends ActorType> = {
  data: ActorEntity<T>;
  updater: UpdateStore<ActorEntity<T>>;
  items: Map<string, ItemProxy>;
  itemOperations: ItemOperations;
  actor: ActorEP;
  openForm?: () => unknown;
  path?: EntityPath;
};

export abstract class ActorProxyBase<T extends ActorType> {
  protected data;
  readonly updater;
  readonly items;
  readonly itemOperations;
  readonly actor;
  readonly openForm;
  readonly path;

  abstract get subtype(): string;

  constructor({
    data,
    updater,
    items,
    itemOperations,
    actor,
    openForm,
    path,
  }: ActorProxyInit<T>) {
    this.data = data;
    this.updater = updater;
    this.items = items;
    this.itemOperations = itemOperations;
    this.actor = actor;
    this.openForm = openForm;
    this.path = path;
  }

  get uuid() {
    return this.actor.uuid;
  }

  get itemTrash() {
    return this.actor.itemTrash;
  }

  get epData() {
    return this.data.system;
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
    return foundry.utils.duplicate(this.data);
  }

  createActor(name?: string) {
    const data = this.dataCopy();
    return ActorEP.create({
      ...data,
      name: name || data.name,
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

  protected addLinkedWindow<T extends object>(
    updater: UpdateStore<any>,
    findData: (actor: ActorEP) => T | null | undefined | false,
    renderWindow: (
      val: T,
    ) => Pick<ReturnType<typeof openWindow>, 'win' | 'wasConnected'>,
  ) {
    const { actor } = this;
    const existed = actor.subscriptions.hasSubscriber(updater);
    actor.subscriptions.subscribe(updater, {
      onEntityUpdate: (actor) => {
        const entity = findData(actor);
        if (entity) renderWindow(entity);
        else closeWindow(updater);
      },
      onSubEnd: () => closeWindow(updater),
    });

    if (!existed) {
      const entity = findData(actor);
      if (!entity) return;
      const { win, wasConnected } = renderWindow(entity);
      if (!wasConnected) {
        win.addEventListener(
          SlWindowEventName.Closed,
          () => actor.subscriptions.unsubscribe(updater),
          { once: true },
        );
      }
    }
  }

  matchRegexp(regex: RegExp) {
    return [this.name, this.type].some((text) => regex.test(text));
  }
}
