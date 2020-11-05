import {
  AppliedEffects,
  ReadonlyAppliedEffects,
} from '@src/entities/applied-effects';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { EquippableItem, ItemProxy } from '@src/entities/item/item';
import type { Software } from '@src/entities/item/proxies/software';
import type { Trait } from '@src/entities/item/proxies/trait';
import { localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import { InfomorphHealth } from '@src/health/infomorph-health';
import { ActorProxyBase, ActorProxyInit } from './actor-proxy-base';

export class Infomorph extends ActorProxyBase<ActorType.Infomorph> {
  private _localEffects?: AppliedEffects;
  private _outsideEffects?: ReadonlyAppliedEffects;
  private _meshHealth?: InfomorphHealth;
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
    return this.epData.subtype;
  }

  get pools() {
    return this.epData.pools;
  }

  get activeEffects() {
    return this._outsideEffects ?? this._localEffects;
  }

  get meshHealth() {
    if (!this._meshHealth) {
      this._meshHealth = new InfomorphHealth({
        data: this.epData.meshHealth,
        statMods: this.activeEffects?.getHealthStatMods(HealthType.Mesh),
        updater: this.updater.prop('data', 'meshHealth').nestedStore(),
        source: localize('mindState'),
        homeDevices: 1, // TODO
      });
    }
    return this._meshHealth;
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

  get itemGroups() {
    const traits: Trait[] = [];
    const ware: EquippableItem[] = [];
    const effects = new AppliedEffects();
    const software: Software[] = [];
    for (const { agent } of this.items) {
      switch (agent.type) {
        case ItemType.Psi:
        case ItemType.Sleight:
          break;

        case ItemType.Trait:
          traits.push(agent);
          effects.add(agent.obtainEffects());
          break;

        case ItemType.Armor:
        case ItemType.MeleeWeapon:
        case ItemType.PhysicalTech:
          if (agent.wareType && agent.equipped) ware.push(agent);

          if (agent.type === ItemType.Armor && agent.equipped) {
            effects.add(agent.obtainEffects());
          }

          if (agent.type === ItemType.PhysicalTech) {
            effects.add(agent.obtainEffects());
          }
          break;

        case ItemType.Software:
          if (agent.equipped) {
            effects.add(agent.obtainEffects());
            software.push(agent);
          }

          break;

        case ItemType.PhysicalService:
          break;

        default:
          break;
      }
    }
    return { traits, ware, software, effects };
  }
}
