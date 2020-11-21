import {
  getWindow,
  openOrRenderWindow,
} from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { renderEgoForm } from '@src/entities/components/render-ego-form';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { openPsiFormWindow } from '@src/entities/item/item-views';
import { Psi } from '@src/entities/item/proxies/psi';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import { ActorEntity, setupItemOperations } from '@src/entities/models';
import type { UpdateStore } from '@src/entities/update-store';
import { totalModifiers, EffectType } from '@src/features/effects';
import { EP } from '@src/foundry/system';
import { lastEventPosition } from '@src/init';
import { pipe } from 'remeda';
import { Ego, FullEgoData } from '../ego';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';
import { SyntheticShell } from './synthetic-shell';

export class Character extends ActorProxyBase<ActorType.Character> {
  readonly ego;

  private _appliedEffects = new AppliedEffects();
  readonly sleights: Sleight[] = [];
  readonly vehicle?: SyntheticShell | null;

  constructor(init: ActorProxyInit<ActorType.Character>) {
    super(init);

    const sleeveItems = new Map<string, ItemProxy>();
    const egoItems = new Map<string, ItemProxy>();

    const { vehicle } = this.epFlags ?? {};
    this.vehicle = vehicle && this.setupVehicle(vehicle);

    this.ego = this.setupEgo(egoItems);

    this.setupItems(sleeveItems, egoItems);

    const egoFormWindow = getWindow(this.updater);
    if (egoFormWindow?.isConnected) this.ego.openForm?.();
  }

  get initiative() {
    return (
      totalModifiers(this.appliedEffects.getGroup(EffectType.Initiative)) +
      this.ego.baseInitiative
    );
  }

  private setupEgo(egoItems: Map<string, ItemProxy>) {
    return new Ego({
      data: this.data,
      updater: (this.updater as unknown) as UpdateStore<FullEgoData>,
      items: egoItems,
      activeEffects: this.appliedEffects,
      actor: this.actor,
      itemOperations: this.itemOperations,
      allowSleights: true,
      openForm: () => {
        openOrRenderWindow({
          key: this.updater,
          content: renderEgoForm(this.ego),
          resizable: ResizeOption.Vertical,
          name: this.name,
        });
      },
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
  }

  private setupVehicle(data: ActorEntity<ActorType.SyntheticShell>) {
    const updater = this.updater
      .prop('flags', EP.Name, 'vehicle')
      .nestedStore();
    const items = new Map<string, ItemProxy>();
    return new SyntheticShell({
      data,
      updater,
      items,
      actor: this.actor,
      itemOperations: setupItemOperations(updater.prop('items').commit),
    });
  }

  private setupItems(
    sleeveItems: Map<string, ItemProxy>,
    egoItems: Map<string, ItemProxy>,
  ) {
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
