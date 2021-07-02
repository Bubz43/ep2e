import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { EquippableItem, ItemProxy } from '@src/entities/item/item';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import type { Trait } from '@src/entities/item/proxies/trait';
import type { ConditionType } from '@src/features/conditions';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { BiologicalHealth } from '@src/health/biological-health';
import { HealthType } from '@src/health/health';
import type { ActorHealth } from '@src/health/health-mixin';
import type { RecoveryConditions } from '@src/health/recovery';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import { PhysicalSleeve, SleeveInfo } from '../sleeve-mixins';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

class BiologicalBase extends ActorProxyBase<ActorType.Biological> {
  get subtype() {
    return this.epData.subtype;
  }
  get damagedArmorUpdater() {
    return this.updater.path('data', 'damagedArmor');
  }
}

export class Biological extends mix(BiologicalBase).with(
  SleeveInfo,
  PhysicalSleeve,
) {
  private _localEffects?: AppliedEffects;
  private _outsideEffects?: ReadonlyAppliedEffects;
  readonly sleeved;

  constructor({
    activeEffects,
    sleeved,
    ...init
  }: ActorProxyInit<ActorType.Biological> & {
    activeEffects?: ReadonlyAppliedEffects;
    sleeved?: boolean;
  }) {
    super(init);
    if (activeEffects) this._outsideEffects = activeEffects;
    this.sleeved = sleeved;
  }

  updateConditions(conditions: ConditionType[]) {
    return this.updater.path('data', 'conditions').commit(conditions);
  }

  get healths(): ActorHealth[] {
    return compact([this.activeMeshHealth, this.physicalHealth]);
  }

  get activeEffects() {
    return this._outsideEffects ?? this.itemGroups.effects;
  }

  get nonDefaultBrain() {
    const { brain } = this.epData;
    return brain ? this.availableBrains.get(brain) : null;
  }

  get sex() {
    return this.epData.sex;
  }

  updateRecoveryConditions(conditions: RecoveryConditions) {
    return this.updater.path('data', 'recoveryConditions').commit(conditions);
  }

  @LazyGetter()
  get availableBrains() {
    const things = new Map<string, PhysicalTech>();
    for (const proxy of this.items.values()) {
      if (proxy.type === ItemType.PhysicalTech && proxy.isBrain) {
        things.set(proxy.id, proxy);
      }
    }
    return things;
  }

  get activeMeshHealth() {
    return this.nonDefaultBrain?.meshHealth;
  }

  @LazyGetter()
  get physicalHealth() {
    return new BiologicalHealth({
      data: this.epData.physicalHealth,
      statMods: this.activeEffects.getHealthStatMods(HealthType.Physical),
      updater: this.updater.path('data', 'physicalHealth').nestedStore(),
      source: this.name,
      isSwarm: this.isSwarm,
      recoveryEffects: this.activeEffects.physicalHealthRecovery,
      recoveryConditions: this.epData.recoveryConditions,
    });
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
        copy.data.state.equipped = true;
        this.itemOperations.add(copy);
      } else {
        notify(
          NotificationType.Error,
          localize('DESCRIPTIONS', 'OnlyWareItems'),
        );
      }
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
    const effects = new AppliedEffects();
    for (const proxy of this.items.values()) {
      if (proxy.type === ItemType.Trait) {
        traits.push(proxy);
        effects.add(proxy.currentEffects);
      } else if ('equipped' in proxy) {
        ware.push(proxy);
        if ('currentEffects' in proxy) {
          effects.add(proxy.currentEffects);
        }
      }
    }
    return { traits, ware, effects };
  }
}
