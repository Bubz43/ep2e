import {
  AddEffects,
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { EquippableItem, ItemProxy } from '@src/entities/item/item';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import type { Software } from '@src/entities/item/proxies/software';
import type { Trait } from '@src/entities/item/proxies/trait';
import type { ConditionType } from '@src/features/conditions';
import { createEffect } from '@src/features/effects';
import { SkillType } from '@src/features/skills';
import { createTag } from '@src/features/tags';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { AppMeshHealth } from '@src/health/app-mesh-health';
import { MeshHealth } from '@src/health/full-mesh-health';
import { HealthStat, HealthType } from '@src/health/health';
import type { ActorHealth } from '@src/health/health-mixin';
import type { RecoveryConditions } from '@src/health/recovery';
import { SyntheticHealth } from '@src/health/synthetic-health';
import { toggle } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import { PhysicalSleeve, SleeveInfo } from '../sleeve-mixins';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

class SyntheticBase extends ActorProxyBase<ActorType.Synthetic> {
  get subtype() {
    return this.epData.subtype;
  }
  get damagedArmorUpdater() {
    return this.updater.path('system', 'damagedArmor');
  }
}

export class Synthetic extends mix(SyntheticBase).with(
  SleeveInfo,
  PhysicalSleeve,
) {
  private _localEffects?: AppliedEffects;
  private _outsideEffects?: ReadonlyAppliedEffects;
  readonly sleeved;
  readonly exoskeleton;

  static get painFilterEffects() {
    return [
      createEffect.health({
        health: HealthType.Physical,
        stat: HealthStat.WoundsIgnored,
        modifier: 1,
      }),
      createEffect.successTest({
        modifier: -10,
        requirement: 'To notice damage',
        tags: [createTag.skill({ skillType: SkillType.Perceive })],
      }),
    ];
  }

  constructor({
    activeEffects,
    sleeved,
    exoskeleton,
    ...init
  }: ActorProxyInit<ActorType.Synthetic> & {
    activeEffects?: ReadonlyAppliedEffects;
    sleeved?: boolean;
    exoskeleton?: boolean;
  }) {
    super(init);
    if (activeEffects) this._outsideEffects = activeEffects;

    this.sleeved = sleeved;
    this.exoskeleton = exoskeleton;
  }

  updateConditions(conditions: ConditionType[]) {
    return this.updater.path('system', 'conditions').commit(conditions);
  }

  get healths(): ActorHealth[] {
    // TODO Only return firewall health if not slaved
    return compact([
      this.activeMeshHealth,
      this.activeFirewallHealth,
      this.physicalHealth,
    ]);
  }

  get activeEffects() {
    return this._outsideEffects ?? this.itemGroups.effects;
  }

  get nonDefaultBrain() {
    const { brain } = this.epData;
    return brain ? this.availableBrains.get(brain) : null;
  }

  get painFilterActive() {
    return !this.isSwarm && this.epData.painFilter;
  }

  get hasPainFilter() {
    return !this.isSwarm;
  }

  get inherentArmorEffect(): AddEffects {
    const { source, ...armors } = this.epData.inherentArmor;
    return {
      source: this.exoskeleton ? this.name : source || localize('frame'),
      effects: [
        createEffect.armor({ ...armors, layerable: !!this.exoskeleton }),
      ],
    };
  }

  updateRecoveryConditions(conditions: RecoveryConditions) {
    return this.updater.path('system', 'recoveryConditions').commit(conditions);
  }

  togglePainFilter() {
    return this.updater.path('system', 'painFilter').commit(toggle);
  }

  @LazyGetter()
  get availableBrains() {
    const brains = new Map<string, PhysicalTech>();
    for (const proxy of this.items.values()) {
      if (proxy.type === ItemType.PhysicalTech && proxy.isBrain) {
        brains.set(proxy.id, proxy);
      }
    }
    return brains;
  }

  @LazyGetter()
  get physicalHealth() {
    return new SyntheticHealth({
      data: this.epData.physicalHealth,
      statMods: this.activeEffects.getHealthStatMods(HealthType.Physical),
      updater: this.updater.path('system', 'physicalHealth').nestedStore(),
      source: `${this.name}: ${
        this.epData.inherentArmor.source || localize('frame')
      }`,
      isSwarm: this.isSwarm,
      recoveryEffects: this.activeEffects.physicalHealthRecovery,
      recoveryConditions: this.epData.recoveryConditions,
    });
  }

  @LazyGetter()
  get meshHealth() {
    return new MeshHealth({
      data: this.epData.meshHealth,
      statMods: this.activeEffects?.getHealthStatMods(HealthType.Mesh),
      updater: this.updater.path('system', 'meshHealth').nestedStore(),
      source: localize('mindState'),
      homeDevices: 1, // TODO,
      deathRating: true,
    });
  }

  @LazyGetter()
  get firewallHealth() {
    return new AppMeshHealth({
      data: this.epData.firewallHealth,
      updater: this.updater.path('system', 'firewallHealth').nestedStore(),
      source: `${localize('firewall')} (${this.epData.firewallRating})`,
    });
  }

  get activeMeshHealth() {
    const { nonDefaultBrain } = this;
    return nonDefaultBrain ? nonDefaultBrain.meshHealth : this.meshHealth;
  }

  get activeFirewallHealth() {
    const { nonDefaultBrain } = this;
    return nonDefaultBrain
      ? nonDefaultBrain.firewallHealth
      : this.firewallHealth;
  }

  addNewItemProxy(proxy: ItemProxy | null | undefined) {
    if (!proxy || this.disabled) return;
    if (this.hasItemProxy(proxy)) {
      return notify(
        NotificationType.Info,
        format('AlreadyHasItem', {
          ownerName: this.name,
          itemName: proxy.name,
        }),
      );
    }

    if (proxy.type === ItemType.Trait) {
      if (proxy.isMorphTrait) {
        if (proxy.hasMultipleLevels) {
          proxy.selectLevelAndAdd(this.itemOperations.add);
        } else {
          this.itemOperations.add(proxy.getDataCopy(true));
        }
      } else {
        notify(
          NotificationType.Error,
          localize('DESCRIPTIONS', 'OnlyMorphTraits'),
        );
      }
    } else if ('wareType' in proxy) {
      if (proxy.isWare) {
        const copy = proxy.getDataCopy(true);
        copy.system.state.equipped = true;
        this.itemOperations.add(copy);
      } else {
        notify(
          NotificationType.Error,
          localize('DESCRIPTIONS', 'OnlyWareItems'),
        );
      }
    } else if (proxy.type === ItemType.Software) {
      if (proxy.isWare) {
        const copy = proxy.getDataCopy(true);
        copy.system.state.equipped = true;
        this.itemOperations.add(copy);
      } else
        notify(
          NotificationType.Error,
          `${localize('software')} - ${localize('onlyWareAllowed')}`,
        );
    } else {
      notify(
        NotificationType.Error,
        localize('DESCRIPTIONS', 'OnlyPhysicalMorphItems'),
      );
    }
  }

  @LazyGetter()
  get itemGroups() {
    const traits: Trait[] = [];
    const ware: EquippableItem[] = [];
    const software: Software[] = [];
    const effects = new AppliedEffects();
    for (const proxy of this.items.values()) {
      if (proxy.type === ItemType.Trait) {
        traits.push(proxy);
        effects.add(proxy.currentEffects);
      } else if (proxy.type === ItemType.Software) {
        software.push(proxy);
        effects.add(proxy.currentEffects);
      } else if ('equipped' in proxy) {
        ware.push(proxy);
        if ('currentEffects' in proxy) {
          effects.add(proxy.currentEffects);
        }
      }
    }
    return { traits, ware, effects, software };
  }
}
