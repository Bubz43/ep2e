import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import type { Software } from '@src/entities/item/proxies/software';
import type { Trait } from '@src/entities/item/proxies/trait';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import { MeshHealth } from '@src/health/full-mesh-health';
import { LazyGetter } from 'lazy-get-decorator';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';
import mix from 'mix-with/lib';
import { SleeveInfo } from '../sleeve-mixins';
import type { ActorHealth } from '@src/health/health-mixin';
import { ArmorType } from '@src/features/active-armor';
import { addFeature, removeFeature } from '@src/features/feature-helpers';
import { identity, mapToObj } from 'remeda';
import { enumValues } from '@src/data-enums';
import type { ConditionType } from '@src/features/conditions';

class InfomorphBase extends ActorProxyBase<ActorType.Infomorph> {
  get subtype() {
    return localize(this.type);
  }
  get damagedArmorUpdater() {
    return this.updater.prop('data', 'damagedArmor');
  }
}

export class Infomorph extends mix(InfomorphBase).with(SleeveInfo) {
  private _localEffects?: AppliedEffects;
  private _outsideEffects?: ReadonlyAppliedEffects;
  readonly sleeved;

  constructor({
    activeEffects,
    sleeved,
    ...init
  }: ActorProxyInit<ActorType.Infomorph> & {
    activeEffects?: ReadonlyAppliedEffects;
    sleeved?: boolean;
  }) {
    super(init);
    if (activeEffects) this._outsideEffects = activeEffects;
    this.sleeved = sleeved;
  }

  updateConditions(conditions: ConditionType[]) {
    return this.updater.prop("data", "conditions").commit(conditions)
  }

  get healths(): ActorHealth[] {
    return [this.meshHealth];
  }

  get activeEffects() {
    return this._outsideEffects ?? this.itemGroups.effects;
  }

  get activeMeshHealth() {
    return this.meshHealth;
  }

  @LazyGetter()
  get meshHealth() {
    return new MeshHealth({
      data: this.epData.meshHealth,
      statMods: this.activeEffects?.getHealthStatMods(HealthType.Mesh),
      updater: this.updater.prop('data', 'meshHealth').nestedStore(),
      source: localize('mindState'),
      homeDevices: 1, // TODO
      deathRating: true,
    });
  }

  @LazyGetter()
  get itemGroups() {
    const traits: Trait[] = [];
    const ware: Software[] = [];
    const effects = new AppliedEffects();
    for (const proxy of this.items.values()) {
      switch (proxy.type) {
        case ItemType.Trait:
          traits.push(proxy);
          effects.add(proxy.currentEffects);
          break;

        case ItemType.Software:
          effects.add(proxy.currentEffects);
          ware.push(proxy);
          break;

        default:
          break;
      }
    }
    return { traits, ware, effects };
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

      case ItemType.Software: {
        const copy = proxy.getDataCopy(true);
        copy.data.state.equipped = true;
        this.itemOperations.add(copy);
        break;
      }

      default:
        notify(
          NotificationType.Error,
          localize('DESCRIPTIONS', 'OnlyInfomorphItems'),
        );
        break;
    }
  }
}
