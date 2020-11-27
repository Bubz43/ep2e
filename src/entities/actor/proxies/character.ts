import {
  getWindow,
  openOrRenderWindow,
} from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { enumValues, PoolType, RechargeType } from '@src/data-enums';
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
import type { PhysicalService } from '@src/entities/item/proxies/physical-service';
import { Psi } from '@src/entities/item/proxies/psi';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import type { Software } from '@src/entities/item/proxies/software';
import type { Trait } from '@src/entities/item/proxies/trait';
import type { ActorEntity, SleeveType } from '@src/entities/models';
import type { UpdateStore } from '@src/entities/update-store';
import { taskState } from '@src/features/actions';
import { EffectType, totalModifiers } from '@src/features/effects';
import { Pool, Pools } from '@src/features/pool';
import { Recharge } from '@src/features/recharge';
import {
  TemporaryFeatureEnd,
  TemporaryFeatureType,
} from '@src/features/temporary';
import {
  CommonInterval,
  createRefreshTimer,
  currentWorldTimeMS,
  getElapsedTime,
  refreshAvailable,
  RefreshTimer,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { nonNegative, notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import { difference, first, flatMap, mapToObj, pipe, reject } from 'remeda';
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

  async spendPool(...pools: { pool: PoolType; points: number }[]) {
    const { updater } = this.poolHolder;
    for (const { pool, points } of pools) {
      this.poolHolder.updater
        .prop('data', 'spentPools', pool)
        .store((spent) => spent + points);
    }
    await updater.commit();
  }

  @LazyGetter()
  get initiative() {
    return (
      totalModifiers(this.appliedEffects.getGroup(EffectType.Initiative)) +
      this.ego.baseInitiative
    );
  }

  get accumulatedTime() {
    return nonNegative(getElapsedTime(this.epData.accumulatedTimeStart));
  }

  @LazyGetter()
  get tasks() {
    return this.epData.tasks.map((task) => ({
      ...task,
      state: taskState(task),
    }));
  }

  @LazyGetter()
  get equippedGroups() {
    const services: (PhysicalService | Software)[] = [];
    const temporaryServices: typeof services = [];
    const fakeIDs: PhysicalService[] = [];
    const expiredServices: typeof services = [];
    // TODO Weapons && active use && fabbers
    for (const item of this.equipped) {
      if (item.type === ItemType.PhysicalService) {
        services.push(item);
        if (!item.isIndefiniteService) {
          temporaryServices.push(item);
          if (item.isExpired) expiredServices.push(item);
        }
        if (item.isFakeEgoId) fakeIDs.push(item);
      } else if (item.type === ItemType.Software) {
        if (item.isService) {
          services.push(item);
          if (!item.isIndefiniteService) {
            temporaryServices.push(item);
            if (item.isExpired) expiredServices.push(item);
          }
        }
      }
    }
    return {
      services,
      fakeIDs,
      expiredServices,
      temporaryServices,
    };
  }

  @LazyGetter()
  get activeDurations() {
    // TODO substances/fabbers/batteries
    return (
      this.timers.length +
      reject(
        this.equippedGroups.services,
        (service) => service.isIndefiniteService,
      ).length +
      this.tasks.length +
      this.temporaryFeatures.length
    );
  }

  get requiresAttention() {
    // TODO substances/fabbers/batteries
    return (
      (!!this.activeDurations &&
        (notEmpty(this.equippedGroups.expiredServices) ||
          this.timers.some(refreshAvailable) ||
          this.tasks.some((task) => task.state.completed))) ||
      this.temporaryFeatures.some(
        ({ startTime, duration }) => getElapsedTime(startTime) >= duration,
      )
    );
  }

  get timers() {
    return [
      ...this.rechargeRefreshTimers,
      ...this.ego.repRefreshTimers,
      ...this.equippedGroups.fakeIDs.flatMap((fake) => fake.refreshTimers),
    ];
  }

  get rechargeRefreshTimers() {
    const timers: RefreshTimer[] = [];

    for (const rechargeType of enumValues(RechargeType)) {
      const { taken, refreshStartTime } = this.recharges[rechargeType];
      if (taken) {
        timers.push(
          createRefreshTimer({
            id: rechargeType,
            label: localize(rechargeType),
            max: CommonInterval.Day,
            startTime: refreshStartTime,
            updateStartTime: this.updater.prop(
              'data',
              rechargeType,
              'refreshStartTime',
            ).commit,
          }),
        );
      }
    }

    return timers;
  }

  @LazyGetter()
  get recharges() {
    const inBiological = this.sleeve?.type === ActorType.Biological;
    const recharges = mapToObj(enumValues(RechargeType), (type) => [
      type,
      new Recharge({ type, inBiological, ...this.epData[type] }),
    ]);

    for (const effect of this._appliedEffects.getGroup(EffectType.Recharge)) {
      recharges[effect.recharge].addEffect(effect);
    }

    return recharges;
  }

  get temporaryFeatures() {
    return this.epData.temporary;
  }

  @LazyGetter()
  get activeRecharge() {
    return pipe(
      this.temporaryFeatures,
      flatMap((temp) =>
        temp.type === TemporaryFeatureType.ActiveRecharge ? temp : [],
      ),
      first(),
    );
  }

  get timeTillRechargeComplete() {
    const { activeRecharge } = this;
    return activeRecharge
      ? nonNegative(
          activeRecharge.duration - getElapsedTime(activeRecharge.startTime),
        )
      : 0;
  }

  completeRecharge(
    recharge: RechargeType,
    newSpentPools: Map<PoolType, number>,
  ) {
    for (const poolType of enumValues(PoolType)) {
      this.updater
        .prop('data', 'spentPools', poolType)
        .store(newSpentPools.get(poolType) || 0);
    }

    this.updater
      .prop('data', recharge)
      .store(({ taken, refreshStartTime }) => {
        return {
          taken: taken + 1,
          refreshStartTime:
            taken === 0 ? currentWorldTimeMS() : refreshStartTime,
        };
      })
      .prop('data', 'temporary')
      .commit(reject((temp) => temp.endOn === TemporaryFeatureEnd.Recharge));
  }

  refreshRecharges() {
    if (this.rechargeRefreshTimers.some(refreshAvailable)) {
      for (const rechargeType of enumValues(RechargeType)) {
        this.updater
          .prop('data', rechargeType)
          .store({ taken: 0, refreshStartTime: 0 });
      }
    }
    return this.updater.commit();
  }

  get pools() {
    return this.poolHolder.poolMap;
  }

  @LazyGetter()
  protected get poolMap() {
    const { spentPools } = this.epData;
    return this.ego.useThreat
      ? new Pools([
          [
            PoolType.Threat,
            new Pool({
              type: PoolType.Threat,
              initialValue: this.epData.threat,
              spent: spentPools.threat,
            }),
          ],
        ])
      : new Pools(
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
              ] as const,
          ),
        ).addEffects(this._appliedEffects.getGroup(EffectType.Pool));
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
        if (proxy.equipped) {
          if ('currentEffects' in proxy) {
            this._appliedEffects.add(proxy.currentEffects);
          }
          if (isSleeveItem(proxy)) sleeveItems.set(proxy.id, proxy);
        }
      } else if ('stashed' in proxy) {
        this[proxy.stashed ? 'stashed' : 'consumables'].push(proxy);
      } else if (proxy.type === ItemType.Trait) {
        const collection = proxy.isMorphTrait ? sleeveItems : egoItems;
        collection.set(proxy.id, proxy);
        this.traits.push(proxy);
        this._appliedEffects.add(proxy.currentEffects);
      } else if (proxy.type === ItemType.Sleight) {
        egoItems.set(proxy.id, proxy);
      }
    }
  }
}
