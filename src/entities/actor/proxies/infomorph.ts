import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { EquippableItem, ItemProxy } from '@src/entities/item/item';
import type { Software } from '@src/entities/item/proxies/software';
import type { Trait } from '@src/entities/item/proxies/trait';
import { notify, NotificationType } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import { InfomorphHealth } from '@src/health/infomorph-health';
import { LazyGetter } from 'lazy-get-decorator';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

export class Infomorph extends ActorProxyBase<ActorType.Infomorph> {
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
    if (!activeEffects) {
      this._localEffects = new AppliedEffects();
      // TODO: Setup local effects;
    } else this._outsideEffects = activeEffects;
    this.sleeved = sleeved;
  }

  get subtype() {
    return localize(this.type);
  }

  get pools() {
    return this.epData.pools;
  }

  get activeEffects() {
    return this._outsideEffects ?? this._localEffects;
  }


  @LazyGetter()
  get meshHealth() {
    return new InfomorphHealth({
      data: this.epData.meshHealth,
      statMods: this.activeEffects?.getHealthStatMods(HealthType.Mesh),
      updater: this.updater.prop('data', 'meshHealth').nestedStore(),
      source: localize('mindState'),
      homeDevices: 1, // TODO
    })
  }

  acceptItemAgent(agent: ItemProxy) {
    if ([ItemType.Psi, ItemType.Sleight].includes(agent.type)) {
      return {
        accept: false,
        override: false,
        rejectReason: `Can only add ${localize(
          agent.type,
        )} to character or ego.`,
      } as const;
    }
    if (agent.type === ItemType.Trait && !agent.isMorphTrait) {
      return {
        accept: false,
        override: false,
        rejectReason: 'Cannot add ego traits.',
      };
    }
    return { accept: true } as const;
  }

  @LazyGetter()
  get itemGroups() {
    const traits: Trait[] = [];
    const ware: Software[] = [];
    const effects = new AppliedEffects();
    for (const { agent } of this.items) {
      switch (agent.type) {
        case ItemType.Trait:
          traits.push(agent);
          effects.add(agent.obtainEffects());
          break;

        case ItemType.Software:
          effects.add(agent.obtainEffects());
          ware.push(agent);
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
