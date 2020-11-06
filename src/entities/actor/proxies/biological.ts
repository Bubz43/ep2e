import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { EquippableItem, ItemProxy } from '@src/entities/item/item';
import type { Trait } from '@src/entities/item/proxies/trait';
import type { ActorEntity } from '@src/entities/models';
import { EffectType } from '@src/features/effects';
import { notify, NotificationType } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { BiologicalHealth } from '@src/health/biological-health';
import { HealthType } from '@src/health/health';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

export class Biological extends ActorProxyBase<ActorType.Biological> {
  #physicalHealth?: BiologicalHealth;
  #localEffects?: AppliedEffects;
  #outsideEffects?: ReadonlyAppliedEffects;

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
    if (!activeEffects) {
      this.#localEffects = new AppliedEffects();
      // TODO: Setup local effects;
    } else this.#outsideEffects = activeEffects;
    this.sleeved = sleeved;
  }

  get pools() {
    return this.epData.pools
  }

  get activeEffects() {
    return (
      this.#outsideEffects || (this.#localEffects as ReadonlyAppliedEffects)
    );
  }

  get subtype() {
    return this.epData.subtype;
  }

  get isSwarm() {
    return this.epData.swarm;
  }

  get physicalHealth() {
    if (this.#physicalHealth === undefined) {
      this.#physicalHealth = new BiologicalHealth({
        data: this.epData.physicalHealth,
        statMods: this.activeEffects.getHealthStatMods(HealthType.Physical),
        updater: this.updater.prop('data', 'physicalHealth').nestedStore(),
        source: localize('frame'),
        isSwarm: this.isSwarm,
        recovery: this.activeEffects.getGroup(EffectType.HealthRecovery),
      });
    }
    return this.#physicalHealth;
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
        // TODO
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

  get itemGroups() {
    const traits: Trait[] = [];
    const ware: EquippableItem[] = [];
    const effects = new AppliedEffects();
    for (const { agent } of this.items) {
      switch (agent.type) {
        case ItemType.Trait:
          traits.push(agent);
          effects.add(agent.obtainEffects());
          break;

        case ItemType.Software: {
          // TODO
        }
          
          break;

        default:
          break;
      }
    }
    return { traits, ware, effects };
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
}
