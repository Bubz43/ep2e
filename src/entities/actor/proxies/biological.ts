import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { EquippableItem, ItemProxy } from '@src/entities/item/item';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import type { Software } from '@src/entities/item/proxies/software';
import type { Trait } from '@src/entities/item/proxies/trait';
import type { ActorEntity } from '@src/entities/models';
import { EffectType } from '@src/features/effects';
import { notify, NotificationType } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { BiologicalHealth } from '@src/health/biological-health';
import { HealthType } from '@src/health/health';
import { LazyGetter } from 'lazy-get-decorator';
import { flatMap, flatMapToObj } from 'remeda';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

export class Biological extends ActorProxyBase<ActorType.Biological> {
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

  get pools() {
    return this.epData.pools;
  }

  get activeEffects() {
    return this._outsideEffects ?? this.itemGroups.effects;
  }

  get nonDefaultBrain() {
    const { brain } = this.epData;
    return brain ? this.availableBrains.get(brain) : null;
  }

  @LazyGetter()
  get availableBrains() {
    const things = new Map<string, PhysicalTech>();
    for (const { agent } of [...this.items]) {
      if (agent.type === ItemType.PhysicalTech && agent.isBrain) {
        things.set(agent.id, agent);
      }
    }
    return things;
  }

  get subtype() {
    return this.epData.subtype;
  }

  get isSwarm() {
    return this.epData.isSwarm;
  }

  get movementRates() {
    return this.epData.movementRates;
  }

  get reachBonus() {
    return this.isSwarm ? 0 : this.epData.reach;
  }

  get prehensileLimbs() {
    return this.epData.prehensileLimbs;
  }

  @LazyGetter()
  get physicalHealth() {
    return new BiologicalHealth({
      data: this.epData.physicalHealth,
      statMods: this.activeEffects.getHealthStatMods(HealthType.Physical),
      updater: this.updater.prop('data', 'physicalHealth').nestedStore(),
      source: localize('frame'),
      isSwarm: this.isSwarm,
      recovery: this.activeEffects.getGroup(EffectType.HealthRecovery),
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

    switch (proxy.type) {
      case ItemType.Trait: {
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
        break;
      }

      case ItemType.Armor:
      case ItemType.BeamWeapon:
      case ItemType.Firearm:
      case ItemType.MeleeWeapon:
      case ItemType.PhysicalTech:
      case ItemType.Railgun:
      case ItemType.SeekerWeapon: {
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
        break;
      }

      default:
        notify(
          NotificationType.Error,
          localize('DESCRIPTIONS', 'OnlyPhysicalMorphItems'),
        );
        break;
    }
  }

  @LazyGetter()
  get itemGroups() {
    const traits: Trait[] = [];
    const ware: EquippableItem[] = [];
    const effects = new AppliedEffects();
    for (const { agent } of this.items) {
      switch (agent.type) {
        case ItemType.Trait:
          traits.push(agent);
          effects.add(agent.currentEffects);
          break;

        case ItemType.Armor:
        case ItemType.BeamWeapon:
        case ItemType.Firearm:
        case ItemType.MeleeWeapon:
        case ItemType.PhysicalTech:
        case ItemType.Railgun:
        case ItemType.SeekerWeapon: {
          ware.push(agent);
          if ('currentEffects' in agent) {
            effects.add(agent.currentEffects);
          }
          break;
        }

        default:
          break;
      }
    }
    return { traits, ware, effects };
  }
}
