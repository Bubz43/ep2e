import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { ItemEP, ItemProxy } from '@src/entities/item/item';
import { Psi } from '@src/entities/item/proxies/psi';
import type { UpdateStore } from '@src/entities/update-store';
import { EP } from '@src/foundry/system';
import { Ego, FullEgoData } from '../ego';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

export class Character extends ActorProxyBase<ActorType.Character> {
  readonly ego;

  #appliedEffects = new AppliedEffects();

  constructor(init: ActorProxyInit<ActorType.Character>) {
    super(init);

    const sleeveItems = new Collection<ItemEP>();
    const egoItems = new Collection<ItemEP>();

    this.ego = new Ego({
      data: this.data,
      updater: (this.updater as unknown) as UpdateStore<FullEgoData>,
      items: egoItems,
      activeEffects: this.appliedEffects,
      disabled: this.disabled,
      actor: this.actor,
      itemOperations: this.itemOperations,
      psi:
        this.epFlags?.psi &&
        new Psi({
          data: this.epFlags.psi,
          updater: this.updater
            .prop('flags', EP.Name, ItemType.Psi)
            .nestedStore(),
          embedded: this.name,
          // TODO Open form and delete self
        }),
      addPsi: this.updater.prop('flags', EP.Name, ItemType.Psi).commit,
    });
  }

  get subtype() {
    return this.ego.egoType;
  }

  get appliedEffects() {
    return this.#appliedEffects as ReadonlyAppliedEffects;
  }

  acceptItemAgent(agent: ItemProxy) {
    return { accept: true } as const;
  }

  async storeTimeAdvance(milliseconds: number) {
    // TODO
  }
}
