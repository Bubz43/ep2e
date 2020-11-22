import {
  getWindow,
  openOrRenderWindow,
} from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { enumValues, PoolType } from '@src/data-enums';
import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { renderEgoForm } from '@src/entities/components/render-ego-form';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type {
  ConsumableItem,
  EquippableItem,
  ItemProxy,
} from '@src/entities/item/item';
import { openPsiFormWindow } from '@src/entities/item/item-views';
import { Psi } from '@src/entities/item/proxies/psi';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import type { Trait } from '@src/entities/item/proxies/trait';
import type { ActorEntity, SleeveType } from '@src/entities/models';
import type { UpdateStore } from '@src/entities/update-store';
import { EffectType, totalModifiers } from '@src/features/effects';
import { Pool } from '@src/features/pool';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import { difference } from 'remeda';
import { openSleeveForm } from '../actor-views';
import { Ego, FullEgoData } from '../ego';
import { isSleeveItem, Sleeve } from '../sleeves';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';
import { Biological } from './biological';
import { Infomorph } from './infomorph';
import { SyntheticShell } from './synthetic-shell';

const nonThreat = difference(enumValues(PoolType), [
  PoolType.Threat,
]) as Exclude<PoolType, PoolType.Threat>[];


export class Character extends ActorProxyBase<ActorType.Character> {
  readonly ego;
  readonly sleeve?: Sleeve | null;
  readonly vehicle?: SyntheticShell | null;

  private _appliedEffects = new AppliedEffects();

  readonly sleights: Sleight[] = [];
  readonly traits: Trait[] = [];
  readonly equipped: EquippableItem[] = [];
  readonly consumables: ConsumableItem[] = [];
  readonly stashed: (EquippableItem | ConsumableItem)[] = [];

  constructor(init: ActorProxyInit<ActorType.Character>) {
    super(init);

    const sleeveItems = new Map<string, ItemProxy>();
    const egoItems = new Map<string, ItemProxy>();

    const { vehicle } = this.epFlags ?? {};
    this.vehicle = vehicle && this.setupVehicle(vehicle);

    this.ego = this.setupEgo(egoItems);
    this.sleeve = this.setupSleeve(sleeveItems);

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

  private setupSleeve(sleeveItems: Map<string, ItemProxy>) {
    const { biological, syntheticShell, infomorph } = this.epFlags ?? {};
    return biological
      ? new Biological(this.sleeveInit(biological, sleeveItems))
      : syntheticShell
      ? new SyntheticShell(this.sleeveInit(syntheticShell, sleeveItems))
      : infomorph
      ? new Infomorph(this.sleeveInit(infomorph, sleeveItems))
      : null;
  }

  private setupVehicle(data: ActorEntity<ActorType.SyntheticShell>) {
    const updater = this.updater
      .prop('flags', EP.Name, 'vehicle')
      .nestedStore();
    const items = new Map<string, ItemProxy>();
    return new SyntheticShell({
      items,
      data,
      activeEffects: this.appliedEffects,
      itemOperations: this.itemOperations,
      sleeved: true,
      actor: this.actor,
      openForm: this.openSleeveForm.bind(this),
      updater,
    });
  }

  private sleeveInit<T extends SleeveType>(
    data: ActorEntity<T>,
    items: Map<string, ItemProxy>,
  ) {
    return {
      items,
      data,
      activeEffects: this.appliedEffects,
      itemOperations: this.itemOperations,
      sleeved: true,
      actor: this.actor,
      updater: this.updater.prop('flags', EP.Name, data.type).nestedStore(),
      openForm: this.openSleeveForm.bind(this),
    };
  }

  private setupItems(
    sleeveItems: Map<string, ItemProxy>,
    egoItems: Map<string, ItemProxy>,
  ) {
    for (const proxy of this.items.values()) {
      if ('equipped' in proxy) {
        this[proxy.equipped ? 'equipped' : 'stashed'].push(proxy);
      } else if ('quantity' in proxy) {
        this[proxy.stashed ? 'stashed' : 'consumables'].push(proxy);
      }
      switch (proxy.type) {
        case ItemType.Sleight: {
          egoItems.set(proxy.id, proxy);

          // this.#appliedEffects.add(proxy.currentEffects)
          break;
        }
        case ItemType.Trait: {
          const collection = proxy.isMorphTrait ? sleeveItems : egoItems;
          collection.set(proxy.id, proxy);
          this.traits.push(proxy);
          this._appliedEffects.add(proxy.currentEffects);
          break;
        }

        default:
          if (isSleeveItem(proxy)) sleeveItems.set(proxy.id, proxy);
          break;
      }
    }
  }

  get pools() {
    return this.poolHolder.poolMap
  } 

  @LazyGetter()
  protected get poolMap() {
    const { useThreat } = this.ego;
    const { spentPools } = this.epData;
    if (useThreat) {
      return new Map([
        [
          PoolType.Threat,
          new Pool({
            type: PoolType.Threat,
            initialValue: this.epData.threat,
            spent: spentPools.threat,
          }),
        ],
      ]);
    }

    const pools = new Map(
      nonThreat.map(
        (type) =>
          [
            type,
            new Pool({
              type,
              initialValue:
                (this.sleeve?.pools[type] || 0) +
                (type === PoolType.Flex ? this.ego.flex : 0),
              spent: spentPools[type],
            }),
          ] as const
      )
    );

    for (const effect of this._appliedEffects.getGroup(EffectType.Pool)) {
      pools.get(effect.pool)?.addEffect(effect);
    }
    pools.forEach(({ max }, type, pools) => max || pools.delete(type));

    return pools;
  }

  get poolHolder() {
    if (this.actor.isToken && this.ego.useThreat) {
      const original = game.actors.get(this.actor.id);
      if (
        original?.proxy.type === ActorType.Character &&
        original.proxy.ego.useThreat
      ) {
        return original.proxy;
      }
    }
    return this;
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

  openSleeveForm() {
    const { sleeve } = this;
    if (!sleeve) return;
    this.addLinkedWindow(
      sleeve.updater,
      ({ proxy }) =>
        proxy.type === ActorType.Character &&
        proxy.sleeve?.type === sleeve.type &&
        proxy.sleeve,
      openSleeveForm,
    );
  }

  openPsiForm() {
    const { psi } = this;
    if (!psi) return;
    const { updater } = psi;
    this.addLinkedWindow(
      updater,
      ({ proxy: agent }) => agent.type === ActorType.Character && agent.psi,
      openPsiFormWindow,
    );
  }
}
