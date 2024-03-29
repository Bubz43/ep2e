import {
  createBaseAttackFormula,
  SoftwareAttack,
  SoftwareAttackData,
} from '@src/combat/attacks';
import { SoftwareType } from '@src/data-enums';
import type { ObtainableEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { currentWorldTimeMS } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { AppMeshHealth } from '@src/health/app-mesh-health';
import { notEmpty, toggle } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Purchasable, Service } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

const serviceTypes = [SoftwareType.AppAsService, SoftwareType.MeshService];
const ware = [SoftwareType.AppAsWare, SoftwareType.Meshware];

class Base extends ItemProxyBase<ItemType.Software> {
  get updateState() {
    return this.updater.path('system', 'state');
  }
}
export class Software
  extends mix(Base).with(Purchasable, Service)
  implements ObtainableEffects, Attacker<SoftwareAttackData, SoftwareAttack>
{
  constructor(init: ItemProxyInit<ItemType.Software>) {
    super(init);
  }

  vehicleOwner?: string | null;

  get fullType() {
    const { softwareType, category } = this;
    const localType = localize(softwareType);
    return localType === category || !category
      ? localType
      : `${localType} (${category})`;
  }

  get category() {
    return this.epData.category;
  }

  get isWare() {
    return ware.includes(this.softwareType);
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

  get activation() {
    return this.epData.activation;
  }

  get hasActivation() {
    return !!this.epData.activation;
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

  get hasMeshAttacks() {
    return this.epData.meshAttacks > 0;
  }

  get skills() {
    return this.epData.skills;
  }

  toggleEquipped() {
    return this.updater
      .path('system', 'state')
      .commit(({ equipped, serviceStartTime }) => ({
        equipped: !equipped,
        serviceStartTime: equipped ? serviceStartTime : currentWorldTimeMS(),
      }));
  }

  toggleActivation() {
    return this.updater.path('system', 'state', 'activated').commit(toggle);
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
    return new AppMeshHealth({
      data: this.epData.meshHealth,
      updater: this.updater.path('system', 'meshHealth').nestedStore(),
      source: localize('process'),
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

  setupAttack(
    { damageFormula, useMeshArmor, ...data }: SoftwareAttackData,
    defaultLabel: string,
  ): SoftwareAttack {
    return {
      ...data,
      label: this.epData.meshAttacks === 2 ? data.label || defaultLabel : '',
      armorUsed: compact([useMeshArmor && ArmorType.Mesh]),
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
    };
  }

  getDataCopy(reset = false) {
    const copy = super.getDataCopy(reset);
    if (reset) {
      copy.system.state = {
        activated: false,
        equipped: false,
        paused: false,
        serviceStartTime: currentWorldTimeMS(),
      };
    }
    return copy;
  }
}
