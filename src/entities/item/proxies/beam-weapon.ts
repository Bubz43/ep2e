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
import { CommonInterval, currentWorldTimeMS } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import { nonNegative } from '@src/utility/helpers';
import mix from 'mix-with/lib';
import { clamp, compact, difference, map, pipe } from 'remeda';
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
    return this.updater.path('data', 'state');
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

  get fullName() {
    return this.singleUseSpent
      ? `[${localize('spent')}] ${this.name}`
      : this.name;
  }

  get canFire() {
    return !!this.availableShots;
  }

  fire(shots: number) {
    return this.updateCharge({
      charge: nonNegative(this.availableShots - shots),
    });
  }

  swapBattery() {
    return this.updateCharge({ charge: this.battery.max });
  }

  updateCharge(changed: Partial<Omit<BeamWeapon['battery'], 'recharge'>>) {
    const max = changed.max ?? this.battery.max;
    const charge = changed.charge ?? this.battery.charge;
    const diff = max - charge;
    return this.updater.path('data', 'battery').commit({
      ...changed,
      recharge: (diff / max) * CommonInterval.Hour * 4 + currentWorldTimeMS(),
    });
  }

  get availableShots() {
    return this.totalCharge;
  }

  get range() {
    return this.epData.range;
  }

  get hasSecondaryAttack() {
    return this.epData.hasSecondaryAttack;
  }

  get battery() {
    return this.epData.battery;
  }

  get fullyCharged() {
    return this.totalCharge === this.battery.max;
  }

  get fullType() {
    const type = pipe(
      [this.wareType, this.type] as const,
      compact,
      map(localize),
    ).join(' ');
    return this.isSingleUse ? `${localize('singleUse')} - ${type}` : type;
  }

  setSingleUseSpent(spent: boolean) {
    this.updater.path('data', 'state', 'used').commit(spent);
  }

  get timeTillFullyCharged() {
    return this.battery.recharge - currentWorldTimeMS();
  }

  private get regainedCharge() {
    const { max, charge } = this.battery;
    if (charge === max) return 0;

    const { timeTillFullyCharged } = this;
    const spentCharge = max - charge;
    if (timeTillFullyCharged <= 0) return spentCharge;

    const gainRate = (CommonInterval.Hour * 4) / max;
    return Math.floor(
      (spentCharge * gainRate - timeTillFullyCharged) / gainRate,
    );
  }

  get totalCharge() {
    const { max, charge } = this.battery;
    return clamp(charge + this.regainedCharge, { min: charge, max });
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
