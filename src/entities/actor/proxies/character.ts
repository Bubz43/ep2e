import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { ItemEP, ItemProxy } from '@src/entities/item/item';
import { openPsiFormWindow } from '@src/entities/item/item-views';
import { Psi } from '@src/entities/item/proxies/psi';
import type { UpdateStore } from '@src/entities/update-store';
import { EP } from '@src/foundry/system';
import { lastEventPosition } from '@src/init';
import { pipe } from 'remeda';
import { Ego, FullEgoData } from '../ego';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

export class Character extends ActorProxyBase<ActorType.Character> {
  readonly ego;

  private _appliedEffects = new AppliedEffects();

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
          deleteSelf: () =>
            this.updater.prop('flags', EP.Name, ItemType.Psi).commit(null),
          openForm: () => this.openPsiForm(),
        }),
      addPsi: this.updater.prop('flags', EP.Name, ItemType.Psi).commit,
    });

    for (const item of this.items) {
      const { proxy } = item;
      switch (proxy.type) {
        case ItemType.Sleight: {
          egoItems.set(item.id, item);
          // this.#appliedEffects.add(proxy.currentEffects)
          break;
        }
        case ItemType.Trait: {
          const collection = proxy.isMorphTrait ? sleeveItems : egoItems;
          collection.set(item.id, item);
          this._appliedEffects.add(proxy.currentEffects);
          break;
        }

        default:
          break;
      }
    }
  }

  get psi() {
    return this.ego.psi;
  }

  get subtype() {
    return this.ego.egoType;
  }

  get appliedEffects() {
    return this._appliedEffects as ReadonlyAppliedEffects;
  }

  acceptItemAgent(agent: ItemProxy) {
    return { accept: true } as const;
  }

  async storeTimeAdvance(milliseconds: number) {
    // TODO
  }

  openPsiForm() {
    const { psi } = this;
    if (!psi) return;
    const { updater } = psi;
    this.addLinkedWindow(
      updater,
      (actor) => {
        return actor.agent.type === ActorType.Character && actor.agent.psi
          ? openPsiFormWindow({ psi: actor.agent.psi }) && true
          : false;
      },
      openPsiFormWindow({
        psi,
        forceFocus: true,
        adjacentEl: pipe(lastEventPosition?.composedPath()[0], (el) =>
          el instanceof HTMLElement ? el : undefined,
        ),
      }),
    );
  }
}
