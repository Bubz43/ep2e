import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import { ItemEP, ItemProxy } from '@src/entities/item/item';
import { openPsiFormWindow } from '@src/entities/item/item-views';
import { Psi } from '@src/entities/item/proxies/psi';
import { createItemEntity } from '@src/entities/models';
import type { UpdateStore } from '@src/entities/update-store';
import { uniqueStringID } from '@src/features/feature-helpers';
import { deepMerge } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { lastEventPosition } from '@src/init';
import { mapToObj, pipe, reject, map } from 'remeda';
import type { DeepPartial } from 'utility-types';
import { Ego, FullEgoData } from '../ego';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';
import { SyntheticShell } from './synthetic-shell';

export class Character extends ActorProxyBase<ActorType.Character> {
  readonly ego;

  private _appliedEffects = new AppliedEffects();

  constructor(init: ActorProxyInit<ActorType.Character>) {
    super(init);

    const sleeveItems = new Map<string, ItemProxy>();
    const egoItems = new Map<string, ItemProxy>();

    if (this.epFlags?.vehicle) {
      const { vehicle: vehicleData } = this.epFlags;
      const updater = this.updater
        .prop('flags', EP.Name, 'vehicle')
        .nestedStore();
      const items = new Map<string, ItemProxy>();
      const vehicle = new SyntheticShell({
        data: vehicleData,
        updater,
        items,
        actor: this.actor,
        itemOperations: {
          add: async (...partialDatas) => {
            // TODO Make sure this doesn't fail because of permissions
            const fullItems = (await ItemEP.create(partialDatas, {
              temporary: true,
            })) as ItemEP[];
            const ids = [...items.keys()];
            await updater.prop('items').commit((items) => {
              const changed = [...items];
              for (const item of fullItems) {
                const _id = uniqueStringID(ids);
                ids.push(_id);
                changed.push({ ...item.dataCopy(), _id });
              }
              return items;
            });
            return ids.slice(-partialDatas.length);
          },
          update: async (...changedDatas) => {
            const ids = mapToObj(changedDatas, (changed) => [
              changed._id,
              changed,
            ]);
            await updater.prop('items').commit(
              map((item) => {
                const changed = ids[item._id];
                return changed
                  ? deepMerge(item, changed as DeepPartial<typeof item>)
                  : item;
              }),
            );
          },
          remove: async (...ids) => {
            await updater
              .prop('items')
              .commit(reject(({ _id }) => ids.includes(_id)));
          },
        },
      });
    }

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

    for (const proxy of this.items.values()) {
      switch (proxy.type) {
        case ItemType.Sleight: {
          egoItems.set(proxy.id, proxy);
          // this.#appliedEffects.add(proxy.currentEffects)
          break;
        }
        case ItemType.Trait: {
          const collection = proxy.isMorphTrait ? sleeveItems : egoItems;
          collection.set(proxy.id, proxy);
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
