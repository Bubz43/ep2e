import { createBaseAttackFormula, SoftwareAttack, SoftwareAttackData } from '@src/combat/attacks';
import { SoftwareType } from '@src/data-enums';
import type { ObtainableEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { localize } from '@src/foundry/localization';
import { MeshHealth } from '@src/health/infomorph-health';
import { notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

const serviceTypes = [SoftwareType.AppAsService, SoftwareType.MeshService];

class Base extends ItemProxyBase<ItemType.Software> {}
export class Software
  extends mix(Base).with(Purchasable)
  implements ObtainableEffects, Attacker<SoftwareAttackData, SoftwareAttack> {
  constructor(init: ItemProxyInit<ItemType.Software>) {
    super(init);
  }

  get fullType() {
    return `${localize(this.softwareType)} ${this.category ? `(${this.category})` : ""}`
  }

  get category() {
    return this.epData.category
  }

  get softwareType() {
    return this.epData.softwareType;
  }

  get isService() {
    return serviceTypes.includes(this.softwareType);
  }

  get state() {
    return this.epData.state;
  }

  get effects() {
    return this.epData.effects;
  }

  get hasActivation() {
    return this.epData.hasActiveState;
  }

  get activatedEffects() {
    return this.epData.activatedEffects;
  }

  get activated() {
    return this.hasActivation && this.state.activated;
  }

  get equipped() {
    return this.state.equipped;
  }

  get isOperatingSystem() {
    return this.softwareType === SoftwareType.OperatingSystem;
  }

  get isFirewall() {
    return this.softwareType === SoftwareType.Firewall;
  }

  get hasMeshAttacks() {
    return this.epData.meshAttacks > 0;
  }

  @LazyGetter()
  get effectGroups() {
    const { effects, activatedEffects, hasActivation } = this;
    const group = new Map<'passive' | 'activated', typeof effects>();
    if (notEmpty(effects)) group.set('passive', effects);
    if (hasActivation && notEmpty(activatedEffects))
      group.set('activated', activatedEffects);
    return group;
  }

  @LazyGetter()
  get meshHealth() {
    return new MeshHealth({
      data: this.epData.meshHealth,
      statMods: undefined,
      updater: this.updater.prop('data', 'meshHealth').nestedStore(),
      source: localize('host'),
      homeDevices: 1, // TODO
      autoRepair: this.isOperatingSystem,
    });
  }

  @LazyGetter()
  get currentEffects() {
    const { effects, activatedEffects, activated } = this;
    return {
      source: this.name,
      effects: compact([effects, activated && activatedEffects]).flat(),
    };
  }

  @LazyGetter()
  get attacks() {
    const { primaryAttack, secondaryAttack, meshAttacks } = this.epData;
    return {
      primary: this.setupAttack(primaryAttack, localize('primaryAttack')),
      secondary:
        meshAttacks === 2
          ? this.setupAttack(secondaryAttack, localize('secondaryAttack'))
          : null,
    };
  }

  setupAttack({ damageFormula, useMeshArmor, ...data }: SoftwareAttackData, defaultLabel: string): SoftwareAttack {
    return {
      ...data,
      label: this.epData.meshAttacks === 2 ? data.label || defaultLabel : "",
      armorUsed: compact([useMeshArmor && ArmorType.Mesh]),
      rollFormulas: damageFormula
      ? [createBaseAttackFormula(damageFormula)]
      : []
    }
  }
}
