import {
  BeamWeaponAttack,
  BeamWeaponAttackData,
  createBaseAttackFormula,
} from '@src/combat/attacks';
import {
  enumValues,
  RangedWeaponAccessory,
  RangedWeaponTrait,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import mix from 'mix-with/lib';
import { difference } from 'remeda';
import type { Attacker } from '../item-interfaces';
import {
  Copyable,
  Equippable,
  Gear,
  Purchasable,
  RangedWeapon,
} from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.BeamWeapon> {
  get weaponTraits() {
    return enumValues(RangedWeaponTrait).filter((trait) => this.epData[trait]);
  }
  get updateState() {
    return this.updater.prop("data", "state")
  }
}
export class BeamWeapon
  extends mix(Base).with(Gear, Purchasable, Equippable, RangedWeapon, Copyable)
  implements Attacker<BeamWeaponAttackData, BeamWeaponAttack> {
  static readonly possibleAccessories = difference(
    enumValues(RangedWeaponAccessory),
    [
      RangedWeaponAccessory.ExtendedMagazine,
      RangedWeaponAccessory.FlashSuppressor,
      RangedWeaponAccessory.Silencer,
      RangedWeaponAccessory.SmartMagazine,
    ],
  );
  constructor(init: ItemProxyInit<ItemType.BeamWeapon>) {
    super(init);
  }

  get range() {
    return this.epData.range;
  }

  get hasSecondaryAttack() {
    return this.epData.hasSecondaryAttack;
  }

  get attacks() {
    const { primaryAttack, secondaryAttack, hasSecondaryAttack } = this.epData;
    return {
      primary: this.setupAttack(primaryAttack, localize('primaryAttack')),
      secondary: hasSecondaryAttack
        ? this.setupAttack(secondaryAttack, localize('secondaryAttack'))
        : null,
    };
  }

  setupAttack(
    { damageFormula, ...data }: BeamWeaponAttackData,
    defaultLabel: string,
  ): BeamWeaponAttack {
    return {
      armorUsed: [ArmorType.Energy],
      reduceAVbyDV: false,
      ...data,
      label: this.hasSecondaryAttack ? data.label || defaultLabel : '',
      damageType: HealthType.Physical,
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
    };
  }
}
