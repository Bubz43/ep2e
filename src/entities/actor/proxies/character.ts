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
  RangedWeapon,
} from '@src/entities/item/item';
import { openPsiFormWindow } from '@src/entities/item/item-views';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import type { FirearmAmmo } from '@src/entities/item/proxies/firearm-ammo';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import type { PhysicalService } from '@src/entities/item/proxies/physical-service';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { Psi } from '@src/entities/item/proxies/psi';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import type { Software } from '@src/entities/item/proxies/software';
import type { Substance } from '@src/entities/item/proxies/substance';
import type { ThrownWeapon } from '@src/entities/item/proxies/thrown-weapon';
import { Trait } from '@src/entities/item/proxies/trait';
import type { ActorEntity, SleeveType } from '@src/entities/models';
import type { UpdateStore } from '@src/entities/update-store';
import { taskState } from '@src/features/actions';
import { ActiveArmor } from '@src/features/active-armor';
import { ConditionType, getConditionEffects } from '@src/features/conditions';
import {
  createEffect,
  EffectType,
  PoolEffect,
  totalModifiers,
  UniqueEffectType,
} from '@src/features/effects';
import { updateFeature } from '@src/features/feature-helpers';
import type { MovementRate } from '@src/features/movement';
import { Pool, Pools } from '@src/features/pool';
import { influenceInfo, PsiInfluenceType } from '@src/features/psi-influence';
import { Recharge } from '@src/features/recharge';
import { getEffectsFromSize } from '@src/features/size';
import {
  TemporaryFeatureEnd,
  TemporaryFeatureType,
} from '@src/features/temporary';
import {
  CommonInterval,
  createLiveTimeState,
  currentWorldTimeMS,
  getElapsedTime,
  LiveTimeState,
  refreshAvailable,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { HealthEditor } from '@src/health/components/health-editor/health-editor';
import type { ActorHealth } from '@src/health/health-mixin';
import { nonNegative, notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import {
  compact,
  difference,
  first,
  flatMap,
  mapToObj,
  pipe,
  reject,
  uniq,
} from 'remeda';
import { traverseActiveElements } from 'weightless';
import type { ItemOperations } from '../actor';
import { openSleeveForm } from '../actor-views';
import { Ego, FullEgoData } from '../ego';
import { formattedSleeveInfo, isSleeveItem, Sleeve } from '../sleeves';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';
import { Biological } from './biological';
import { Infomorph } from './infomorph';
import { Synthetic } from './synthetic';

const nonThreat = difference(enumValues(PoolType), [
  PoolType.Threat,
]) as Exclude<PoolType, PoolType.Threat>[];

export class Character extends ActorProxyBase<ActorType.Character> {
  readonly ego;
  readonly sleeve?: Sleeve | null;
  readonly vehicle?: Synthetic | null;

  private _appliedEffects = new AppliedEffects();

  readonly armor;

  readonly passiveSleights: Sleight[] = [];
  readonly activatedSleights: Sleight[] = [];
  readonly egoTraits: Trait[] = [];
  readonly morphTraits: Trait[] = [];
  readonly vehicleTraits: Trait[] = [];
  readonly equipped: EquippableItem[] = [];
  readonly consumables: ConsumableItem[] = [];
  readonly awaitingOnsetSubstances: Substance[] = [];
  readonly activeSubstances: Substance[] = [];
  readonly stashed: (EquippableItem | ConsumableItem)[] = [];

  private appliedHealthEffects = false;

  constructor(init: ActorProxyInit<ActorType.Character>) {
    super(init);

    const sleeveItems = new Map<string, ItemProxy>();
    const egoItems = new Map<string, ItemProxy>();
    const vehicleItems = new Map<string, ItemProxy>();

    const { vehicle } = this.epFlags ?? {};
    this.vehicle = vehicle && this.setupVehicle(vehicle, vehicleItems);

    this.sleeve = this.setupSleeve(sleeveItems);
    this.ego = this.setupEgo(egoItems);

    this.setupItems({ sleeveItems, egoItems, vehicleItems });

    for (const temp of this.epData.temporary) {
      if (temp.type === TemporaryFeatureType.Effects) {
        this._appliedEffects.add({
          source: temp.name,
          effects: temp.effects,
        });
      }
    }

    if (this.sleeve?.type === ActorType.Synthetic) {
      this._appliedEffects.add(this.sleeve.inherentArmorEffect);
      if (this.sleeve.painFilterActive) {
        this._appliedEffects.add({
          source: localize('painFilter'),
          effects: Synthetic.painFilterEffects,
        });
      }
    }

    if (this.vehicle) {
      const vehicleEffects = this.vehicle.inherentArmorEffect;
      this._appliedEffects.add(getEffectsFromSize(this.vehicle.size));

      const { unarmedDV, pools } = this.vehicle;
      const poolEffects: PoolEffect[] = [];
      for (const pool of enumValues(PoolType)) {
        if (pool !== PoolType.Threat) {
          const value = pools[pool];
          if (value)
            vehicleEffects.effects.push(
              createEffect.pool({ pool, modifier: value }),
            );
        }
      }
      this._appliedEffects.add(vehicleEffects);

      unarmedDV &&
        this._appliedEffects.add({
          source: this.vehicle.name,
          effects: [createEffect.melee({ dvModifier: unarmedDV })],
        });
    } else if (this.sleeve && this.sleeve?.type !== ActorType.Infomorph) {
      this._appliedEffects.add(getEffectsFromSize(this.sleeve.size));
    }

    this.armor = new ActiveArmor(
      this._appliedEffects.getGroup(EffectType.Armor),
      this.ego.aptitudes.som,
      this.sleeve?.epData.damagedArmor,
      this.ego.settings.ignoreOverburdened,
    );
    this._appliedEffects.add(this.armor.currentEffects);

    for (const condition of this.conditions) {
      this._appliedEffects.add({
        source: localize(condition),
        effects: getConditionEffects(condition),
      });
    }

    const egoFormWindow = getWindow(this.updater);
    if (egoFormWindow?.isConnected) this.ego.openForm?.();
  }

  get morphReach() {
    const { sleeve } = this;
    return (
      (!sleeve || sleeve.type === ActorType.Infomorph ? 0 : sleeve.reach) +
      (this.vehicle?.reach || 0) +
      this.appliedEffects
        .getGroup(EffectType.Melee)
        .reduce((accum, { reachBonus }) => accum + (reachBonus || 0), 0)
    );
  }

  get morphSize() {
    const { sleeve, vehicle } = this;
    if (vehicle) return vehicle.size;
    if (!sleeve || sleeve.type === ActorType.Infomorph) return null;
    return sleeve.size;
  }

  get cannotFlipFlop() {
    return this.appliedEffects
      .getGroup(EffectType.Misc)
      .some(({ unique }) => unique === UniqueEffectType.NoFlipFlop);
  }

  get hasSleights() {
    return !!(this.passiveSleights.length || this.activatedSleights.length);
  }

  @LazyGetter()
  get weapons() {
    const melee: MeleeWeapon[] = [];
    const software: Software[] = [];
    const thrown: (ThrownWeapon | Explosive)[] = [];
    const explosives: Explosive[] = [];
    const ranged: RangedWeapon[] = [];
    const ammo: (Explosive | FirearmAmmo | Substance)[] = [];

    for (const consumable of this.consumables) {
      switch (consumable.type) {
        case ItemType.Explosive:
          explosives.push(consumable);
          if (consumable.isGrenade) thrown.push(consumable);
          else if (consumable.isMissile) ammo.push(consumable);
          break;

        case ItemType.FirearmAmmo:
          ammo.push(consumable);
          break;

        case ItemType.Substance:
          if (!consumable.isElectronic) ammo.push(consumable);
          break;

        case ItemType.ThrownWeapon:
          thrown.push(consumable);
          break;
      }
    }

    for (const equipped of this.equipped) {
      switch (equipped.type) {
        case ItemType.MeleeWeapon:
          melee.push(equipped);
          break;

        case ItemType.Software:
          equipped.hasMeshAttacks && software.push(equipped);
          break;

        case ItemType.BeamWeapon:
        case ItemType.Firearm:
        case ItemType.Railgun:
        case ItemType.SeekerWeapon:
        case ItemType.SprayWeapon:
          ranged.push(equipped);

        default:
          break;
      }
    }
    return {
      explosives,
      thrown,
      melee,
      software,
      ranged,
      ammo,
    };
  }

  addConditions(conditions: ConditionType[]) {
    return this.sleeve?.updateConditions(
      uniq([...this.conditions, ...conditions]),
    );
  }

  toggleCondition(condition: ConditionType) {
    const conditions = new Set(this.conditions);
    conditions.delete(condition) || conditions.add(condition);

    return this.sleeve?.updateConditions([...conditions]);
  }

  updateConditions(conditions: ConditionType[]) {
    return this.sleeve?.updateConditions(conditions);
  }

  @LazyGetter()
  get movementModifiers() {
    return !this.sleeve || this.sleeve.type === ActorType.Infomorph
      ? {}
      : {
          encumbered: this.armor.isEncumbered(
            this.sleeve.physicalHealth.main.durability.value,
          ),
          overburdened: this.armor.isOverburdened,
        };
  }

  @LazyGetter()
  get movementRates(): (MovementRate & {
    skill: string;
    original: { base: number; full: number };
  })[] {
    if (!this.sleeve || this.sleeve.type === ActorType.Infomorph) return [];
    const { movementRates } = this.sleeve;
    const { movementEffects } = this._appliedEffects;
    const { encumbered, overburdened } = this.movementModifiers;
    const change = (initial: number, mod: number) =>
      encumbered
        ? 0
        : Math.ceil(nonNegative(initial + mod) / (overburdened ? 2 : 1));
    const finalMovements = movementRates.map((movement) => {
      const mods = movementEffects.modify.get(movement.type);
      return {
        type: movement.type,
        base: change(movement.base, mods?.baseModification || 0),
        full: change(movement.full, mods?.fullModification || 0),
        skill: movement.skill,
        original: { base: movement.base, full: movement.full },
      };
    });
    return [
      ...finalMovements,
      ...movementEffects.granted.map((m) => ({
        ...m,
        original: { base: m.base, full: m.full },
      })),
    ];
  }

  async addToSpentPools(...pools: { pool: PoolType; points: number }[]) {
    const { updater } = this.poolHolder;
    for (const { pool, points } of pools) {
      this.poolHolder.updater
        .path('data', 'spentPools', pool)
        .store((spent) => nonNegative(spent + points));
    }
    await updater.commit();
  }

  get primaryHealths(): ActorHealth[] {
    const { sleeve } = this;
    const healths: ActorHealth[] = [];
    if (this.ego.trackMentalHealth) healths.push(this.ego.mentalHealth);
    if (sleeve) {
      if (sleeve.type !== ActorType.Infomorph)
        healths.push(sleeve.physicalHealth);
      if (sleeve.activeMeshHealth) healths.push(sleeve.activeMeshHealth);
    }
    if (this.vehicle) {
      healths.push(this.vehicle.physicalHealth);
    }
    return healths;
  }

  get healths(): ActorHealth[] {
    return compact([
      this.ego.trackMentalHealth && this.ego.mentalHealth,
      // TODO Vehicle
      // TODO Item Healths
      ...(this.sleeve?.healths ?? []),
    ]);
  }

  @LazyGetter()
  get initiative() {
    return (
      Math.round(
        (totalModifiers(this.appliedEffects.getGroup(EffectType.Initiative)) +
          this.ego.baseInitiative) *
          100,
      ) / 100
    );
  }

  get networkSettings() {
    return this.epData.network;
  }

  get accumulatedTime() {
    return nonNegative(getElapsedTime(this.epData.accumulatedTimeStart));
  }

  get conditions() {
    return this.sleeve?.conditions ?? [];
  }

  @LazyGetter()
  get foreignPsiInfluences() {
    return (this.epFlags?.foreignPsiInfluences || []).map((influence) => {
      const active = ('active' in influence && influence.active) || {
        duration: -1,
        startTime: 0,
      };
      const timeState = createLiveTimeState({
        ...active,
        id: influence.id,
        label: influenceInfo(influence).name,
        updateStartTime: (newStartTime) => {
          this.updater.path('flags', EP.Name, 'foreignPsiInfluences').commit(
            (influences) =>
              influences &&
              updateFeature(influences, {
                id: influence.id,
                active: { ...active, startTime: newStartTime },
              }),
          );
        },
      });

      return influence.type === PsiInfluenceType.Trait
        ? {
            ...influence,
            timeState,
            trait: new Trait({
              data: influence.trait,
              embedded: this.name,
              lockSource: true,
              isPsiInfluence: true,
              temporary: localize('psiInfluence'),
              // updater: new UpdateStore({
              //   getData: () => influence.trait,
              //   isEditable: () => this.editable,
              //   setData: (changed) => {
              //     this.influenceCommiter((influences) =>
              //       updateFeature(influences, {
              //         id: influence.id,
              //         trait: deepMerge(influence.trait, changed),
              //       }),
              //     );
              //   },
              // }),
            }),
          }
        : { ...influence, timeState };
    });
  }

  @LazyGetter()
  get temporaryConditionSources() {
    const temporary = this.temporaryFeatures.reduce((accum, temp) => {
      if (temp.type === TemporaryFeatureType.Condition) {
        accum.get(temp.condition)?.push(temp.timeState) ??
          accum.set(temp.condition, [temp.timeState]);
      }
      return accum;
    }, new Map<ConditionType, LiveTimeState[]>());

    for (const { appliedInfo, severity, appliedName } of this
      .activeSubstances) {
      const severe = appliedInfo.multiTimeStates?.get('severe');
      if (
        appliedInfo.appliedSeverity &&
        severe &&
        notEmpty(severity.conditions)
      ) {
        const timeState = createLiveTimeState({
          ...severe[0],
          label: `${appliedName} ${localize('severe')} ${localize('effects')}`,
        });

        for (const condition of severity.conditions) {
          temporary.get(condition)?.push(timeState) ??
            temporary.set(condition, [timeState]);
        }
      }
    }
    return temporary;
  }

  @LazyGetter()
  get tasks() {
    return this.epData.tasks.map((task) => ({
      ...task,
      state: taskState(
        task.failed ? { ...task, timeframe: task.timeframe * 0.25 } : task,
        this.appliedEffects.taskTimeframeEffects,
      ),
    }));
  }

  @LazyGetter()
  get itemsIncludingTemporary() {
    return [
      [...this.items.values()].filter(
        (i) => i.type !== ItemType.Substance || !i.appliedState,
      ),
      this.activeSubstances.flatMap((i) => i.appliedInfo.items),
    ].flat();
  }

  @LazyGetter()
  get equippedGroups() {
    const services: (PhysicalService | Software)[] = [];
    const temporaryServices: typeof services = [];
    const fakeIDs: PhysicalService[] = [];
    const expiredServices: typeof services = [];
    const activeFabbers: PhysicalTech[] = [];
    const devices = new Map<PhysicalTech, boolean>();
    const onboardALIs = new Map<string, PhysicalTech>();
    const softwareSkills: Software[] = [];
    let masterDevice: PhysicalTech | null = null;
    // const singleUseItems: (PhysicalTech | RangedWeapon | MeleeWeapon)[] = [];
    const { masterDeviceId, unslavedDevices } = this.networkSettings;

    // TODO Weapons && active use
    for (const item of this.equipped) {
      if (item.type === ItemType.PhysicalService) {
        services.push(item);
        if (!item.isIndefiniteService) {
          temporaryServices.push(item);
          if (item.isExpired) expiredServices.push(item);
        }
        if (item.isFakeEgoId && item.reputations.length) fakeIDs.push(item);
      } else if (item.type === ItemType.Software) {
        if (item.isService) {
          services.push(item);
          if (!item.isIndefiniteService) {
            temporaryServices.push(item);
            if (item.isExpired) expiredServices.push(item);
          }
        }
        if (notEmpty(item.skills)) softwareSkills.push(item);
      } else if (item.type === ItemType.PhysicalTech) {
        if (item.isActiveFabber) activeFabbers.push(item);
        if (item.deviceType) {
          if (item.id === masterDeviceId) masterDevice = item;
          else devices.set(item, !unslavedDevices.includes(item.id));

          if (item.hasOnboardALI) onboardALIs.set(item.id, item);
        }
      }
    }
    return {
      services,
      fakeIDs,
      expiredServices,
      temporaryServices,
      activeFabbers,
      devices,
      masterDevice,
      softwareSkills,
      onboardALIs,
    };
  }

  @LazyGetter()
  get regeningHealths() {
    return this.healths.filter(({ regenState }) => regenState);
  }

  @LazyGetter()
  get activeDurations() {
    // TODO batteries
    return (
      this.refreshTimers.length +
      reject(
        this.equippedGroups.services,
        (service) => service.isIndefiniteService,
      ).length +
      this.tasks.length +
      this.temporaryFeatures.length +
      this.equippedGroups.activeFabbers.length +
      this.regeningHealths.reduce(
        (accum, { activeRecoveries }) => accum + (activeRecoveries?.size || 0),
        0,
      ) +
      this.awaitingOnsetSubstances.length +
      this.activeSubstances.length +
      (this.psi?.activePsiInfluences.size ?? 0)
    );
  }

  get requiresAttention(): boolean {
    // TODO batteries
    return (
      (!!this.activeDurations &&
        (notEmpty(this.equippedGroups.expiredServices) ||
          this.refreshTimers.some(refreshAvailable) ||
          this.tasks.some((task) => task.state.completed))) ||
      this.temporaryFeatures.some(({ timeState }) => timeState.completed) ||
      this.equippedGroups.activeFabbers.some(
        (fabber) => fabber.printState.completed,
      ) ||
      this.healths.some((health) =>
        [...(health.activeRecoveries?.values() || [])].some(
          ({ timeState }) => timeState.completed,
        ),
      ) ||
      this.awaitingOnsetSubstances.some(
        ({ awaitingOnsetTimeState }) => awaitingOnsetTimeState.completed,
      ) ||
      this.activeSubstances.some(
        ({ appliedInfo }) => appliedInfo.requiresAttention,
      ) ||
      [...(this.psi?.activePsiInfluences.values() || [])].some(
        (timeState) => timeState.completed,
      )
    );
  }

  @LazyGetter()
  get refreshTimers(): LiveTimeState[] {
    return [
      ...this.rechargeRefreshTimers,
      ...this.ego.repRefreshTimers,
      ...this.equippedGroups.fakeIDs.flatMap((fake) => fake.refreshTimers),
    ];
  }

  @LazyGetter()
  get rechargeRefreshTimers() {
    const timers: LiveTimeState[] = [];

    for (const rechargeType of enumValues(RechargeType)) {
      const { taken, refreshStartTime } = this.recharges[rechargeType];
      if (taken) {
        timers.push(
          createLiveTimeState({
            id: rechargeType,
            label: localize(rechargeType),
            duration: CommonInterval.Day,
            startTime: refreshStartTime,
            updateStartTime: this.updater.path(
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

  @LazyGetter()
  get temporaryFeatures() {
    // TODO apply effect duration effects to effect features
    return this.epData.temporary.map((temp) => ({
      ...temp,
      timeState: createLiveTimeState({
        label: temp.name,
        duration: temp.duration,
        startTime: temp.startTime,
        id: `temporary-${temp.id}`,
        updateStartTime: (startTime) =>
          this.updater
            .path('data', 'temporary')
            .commit((temps) =>
              updateFeature(temps, { id: temp.id, startTime }),
            ),
      }),
    }));
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
    return this.activeRecharge?.timeState.remaining ?? 0;
  }

  completeRecharge(
    recharge: RechargeType,
    newSpentPools: Map<PoolType, number>,
  ) {
    for (const poolType of enumValues(PoolType)) {
      this.updater
        .path('data', 'spentPools', poolType)
        .store(newSpentPools.get(poolType) || 0);
    }

    this.updater.batchCommits(() => {
      if (this.psi?.receded) {
        this.psi.updater.path('data', 'state', 'receded').store(false);
      }
      if (this.psi && !this.psi.hasActiveInfluences) {
        this.psi.updateInfectionRating(
          recharge === RechargeType.Short
            ? this.psi.infectionRating - 10
            : this.psi.baseInfectionRating,
        );
      }
      this.updater
        .path('data', recharge)
        .store(({ taken, refreshStartTime }) => ({
          taken: taken + 1,
          refreshStartTime:
            taken === 0 ? currentWorldTimeMS() : refreshStartTime,
        }))
        .path('data', 'temporary')
        .commit(reject((temp) => temp.endOn === TemporaryFeatureEnd.Recharge));
    });
  }

  refreshRecharges() {
    if (this.rechargeRefreshTimers.some(refreshAvailable)) {
      for (const rechargeType of enumValues(RechargeType)) {
        this.updater
          .path('data', rechargeType)
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
    if (!this.appliedHealthEffects) {
      for (const health of this.primaryHealths) {
        this._appliedEffects.add(health.currentEffects);
      }
      this.appliedHealthEffects = true;
    }
    return this._appliedEffects as ReadonlyAppliedEffects;
  }

  acceptItemAgent(agent: ItemProxy) {
    return { accept: true } as const;
  }

  openVehicleForm() {
    const { vehicle } = this;
    if (!vehicle) return;
    this.addLinkedWindow(
      vehicle.updater,
      ({ proxy }) =>
        proxy.type === ActorType.Character &&
        proxy.vehicle?.type === vehicle.type &&
        proxy.vehicle,
      openSleeveForm,
    );
  }

  openSleeveApp() {
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

  openHealthEditor(health: ActorHealth) {
    const active = traverseActiveElements();
    HealthEditor.openWindow({
      actor: this.actor,
      initialHealth: health,
      adjacentEl: active instanceof HTMLElement ? active : undefined,
    });
  }

  private setupEgo(egoItems: Map<string, ItemProxy>) {
    return new Ego({
      data: this.data,
      updater: (this.updater as unknown) as UpdateStore<FullEgoData>,
      items: egoItems,
      activeEffects: this._appliedEffects,
      actor: this.actor,
      itemOperations: this.itemOperations,
      allowSleights: true,
      openForm: () => {
        openOrRenderWindow({
          key: this.updater,
          content: renderEgoForm(this.ego),
          resizable: ResizeOption.Vertical,
          name: `${this.name} - ${localize('ego')}`,
        });
      },
      psi:
        this.epFlags?.psi &&
        new Psi({
          data: this.epFlags.psi,
          updater: this.updater
            .path('flags', EP.Name, ItemType.Psi)
            .nestedStore(),
          embedded: this.name,
          deleteSelf: () =>
            this.updater.path('flags', EP.Name, ItemType.Psi).commit(null),
          openForm: () => this.openPsiForm(),
          actor: this.actor,
          sleeve: this.sleeve,
        }),
      addPsi: this.updater.path('flags', EP.Name, ItemType.Psi).commit,
    });
  }

  private setupSleeve(sleeveItems: Map<string, ItemProxy>) {
    const { biological, synthetic, infomorph } = this.epFlags ?? {};
    return biological
      ? new Biological(this.sleeveInit(biological, sleeveItems))
      : synthetic
      ? new Synthetic(this.sleeveInit(synthetic, sleeveItems))
      : infomorph
      ? new Infomorph(this.sleeveInit(infomorph, sleeveItems))
      : null;
  }

  private setupVehicle(
    data: ActorEntity<ActorType.Synthetic>,
    items: Map<string, ItemProxy>,
  ) {
    const updater = this.updater
      .path('flags', EP.Name, 'vehicle')
      .nestedStore();
    const add: ItemOperations['add'] = async (...datas) => {
      const newIds = await this.itemOperations.add(...datas);
      await updater
        .path('flags', EP.Name, 'exoskeletonItemIds')
        .commit((ids) => [...(ids || []), ...newIds]);
      return newIds;
    };
    const remove: ItemOperations['remove'] = async (...removedIds) => {
      const removed = await this.itemOperations.remove(...removedIds);
      await updater
        .path('flags', EP.Name, 'exoskeletonItemIds')
        .commit((ids) => difference(ids || [], removed));
      return removed;
    };
    return new Synthetic({
      items,
      data,
      activeEffects: this._appliedEffects,
      itemOperations: {
        add,
        remove,
        update: this.itemOperations.update,
      },
      sleeved: true,
      actor: this.actor,
      openForm: this.openVehicleForm.bind(this),
      exoskeleton: true,
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
      activeEffects: this._appliedEffects,
      itemOperations: this.itemOperations,
      sleeved: true,
      actor: this.actor,
      updater: this.updater.path('flags', EP.Name, data.type).nestedStore(),
      openForm: this.openSleeveApp.bind(this),
    };
  }

  get applyLocalSleightEffects() {
    return !this.psi || this.psi?.isFunctioning;
  }

  private setupItems({
    sleeveItems,
    egoItems,
    vehicleItems,
  }: {
    sleeveItems: Map<string, ItemProxy>;
    egoItems: Map<string, ItemProxy>;
    vehicleItems: Map<string, ItemProxy>;
  }) {
    const sleights: Sleight[] = [];
    const vehicleItemIds = new Set(
      this.vehicle?.epFlags?.exoskeletonItemIds || [],
    );
    for (const item of this.items.values()) {
      if (item.type === ItemType.Substance && item.appliedState) {
        if (item.appliedState === 'active') {
          this.activeSubstances.push(item);
          const { effects, items } = item.appliedInfo;
          this._appliedEffects.add(effects);
          for (const substanceItem of items) {
            if (substanceItem.type === ItemType.Trait) {
              this[
                substanceItem.isMorphTrait ? 'morphTraits' : 'egoTraits'
              ].push(substanceItem);
              this._appliedEffects.add(substanceItem.currentEffects);
            } else {
              sleights.push(substanceItem);
            }
          }
        } else this.awaitingOnsetSubstances.push(item);
        continue;
      }
      if ('equipped' in item) {
        this[item.equipped ? 'equipped' : 'stashed'].push(item);
        if (item.equipped) {
          if ('currentEffects' in item) {
            this._appliedEffects.add(item.currentEffects);
          }
          if (isSleeveItem(item)) {
            (vehicleItemIds.has(item._id) ? vehicleItems : sleeveItems).set(
              item.id,
              item,
            );
          }
        }
      } else if ('stashed' in item) {
        this[item.stashed ? 'stashed' : 'consumables'].push(item);
      } else if (item.type === ItemType.Trait) {
        if (vehicleItemIds.has(item.id)) {
          vehicleItems.set(item.id, item);
          this.vehicleTraits.push(item);
        } else {
          const collection = item.isMorphTrait ? sleeveItems : egoItems;
          collection.set(item.id, item);
          this[item.isMorphTrait ? 'morphTraits' : 'egoTraits'].push(item);
        }

        this._appliedEffects.add(item.currentEffects);
      } else if (item.type === ItemType.Sleight) {
        sleights.push(item);
        egoItems.set(item.id, item);
      }
    }

    // This has to go after item setup to make sure sleeve has brain item
    const { applyLocalSleightEffects } = this;
    if (this.ego.psi?.isFunctioning) {
      for (const [activeInfluence] of this.ego.psi.activePsiInfluences) {
        if (activeInfluence.type === PsiInfluenceType.Trait) {
          const { trait } = activeInfluence;
          this[trait.isMorphTrait ? 'morphTraits' : 'egoTraits'].push(trait);
          this._appliedEffects.add(trait.currentEffects);
        }
      }
    }
    for (const foreignInfluence of this.foreignPsiInfluences) {
      if (foreignInfluence.type === PsiInfluenceType.Trait) {
        const { trait } = foreignInfluence;
        this[trait.isMorphTrait ? 'morphTraits' : 'egoTraits'].push(trait);
        this._appliedEffects.add(trait.currentEffects);
      }
    }
    for (const sleight of sleights) {
      if (sleight.isChi) {
        applyLocalSleightEffects &&
          this._appliedEffects.add(
            sleight.getPassiveEffects(
              this.ego.aptitudes.wil,
              !!this.ego.psi?.hasChiIncreasedEffect,
            ),
          );
        this.passiveSleights.push(sleight);
      } else {
        this.activatedSleights.push(sleight);
        if (sleight.isSustaining && applyLocalSleightEffects)
          this._appliedEffects.add(sleight.effectsFromSustaining);
      }
    }
  }

  matchRegexp(regex: RegExp) {
    return compact([
      this.name,
      localize(this.type),
      this.sleeve && formattedSleeveInfo(this.sleeve).join(' '),
    ]).some((text) => regex.test(text));
  }
}
