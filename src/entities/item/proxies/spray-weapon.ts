import {
  createBaseAttackFormula,
  SprayWeaponAttack,
  SprayWeaponAttackData,
} from '@src/combat/attacks';
import {
  AreaEffectType,
  enumValues,
  RangedWeaponAccessory,
  RangedWeaponTrait,
  SprayPayload,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { EP } from '@src/foundry/system';
import { HealthType } from '@src/health/health';
import { nonNegative } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact, difference } from 'remeda';
import type { Attacker } from '../item-interfaces';
import {
  Copyable,
  Equippable,
  Gear,
  Purchasable,
  RangedWeapon,
} from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Substance } from './substance';

class Base extends ItemProxyBase<ItemType.SprayWeapon> {
  get weaponTraits() {
    const { long, fixed } = this.epData;
    return compact([
      long && RangedWeaponTrait.Long,
      fixed && RangedWeaponTrait.Fixed,
    ]);
  }
}
export class SprayWeapon
  extends mix(Base).with(Gear, Purchasable, Equippable, RangedWeapon, Copyable)
  implements Attacker<SprayWeaponAttackData, SprayWeaponAttack> {
  static readonly possibleAccessories = difference(
    enumValues(RangedWeaponAccessory),
    [
      RangedWeaponAccessory.ExtendedMagazine,
      RangedWeaponAccessory.FlashSuppressor,
      RangedWeaponAccessory.Silencer,
      RangedWeaponAccessory.SmartMagazine,
    ],
  );
  constructor(init: ItemProxyInit<ItemType.SprayWeapon>) {
    super(init);
  }

  get payloadUse() {
    return this.epData.payloadUse;
  }
  get dosesPerShot() {
    return this.epData.dosesPerShot;
  }

  get availableShots() {
    return this.ammoState.value;
  }

  get firePayload() {
    return this.payloadUse === SprayPayload.FirePayload;
  }

  get coatedShots() {
    return this.payloadUse === SprayPayload.CoatAmmunition
      ? Math.min(this.payload?.quantity || 0, this.availableShots)
      : 0;
  }

  get ammoState() {
    const { value, max } = this.epData.ammo;
    const common = { max, hasChamber: false };
    return this.firePayload
      ? {
          ...common,
          value: Math.ceil((this.payload?.quantity || 0) / this.dosesPerShot),
        }
      : { ...common, value: Math.min(value, max) };
  }

  updateAmmoValue(newValue: number) {
    return this.payloadUse === SprayPayload.FirePayload
      ? this.payload?.updater.prop('data', 'quantity').commit(newValue)
      : this.updater.prop('data', 'ammo', 'value').commit(newValue);
  }

  spendAmmo(amount: number) {
    const { payloadUse, payload } = this;
    if (payloadUse && payload) {
      payload.updater
        .prop('data', 'quantity')
        .store((quantity) =>
          nonNegative(
            quantity -
              amount *
                (payloadUse === SprayPayload.FirePayload
                  ? this.dosesPerShot
                  : 1),
          ),
        );
    }
    return this.updater
      .prop('data', 'ammo', 'value')
      .commit(nonNegative(this.ammoState.value - amount));
  }

  @LazyGetter()
  get attacks() {
    return {
      primary: this.setupAttack(this.epData.primaryAttack),
      secondary: null,
    };
  }

  setupAttack({
    damageFormula,
    armorUsed,
    ...data
  }: SprayWeaponAttackData): SprayWeaponAttack {
    return {
      label: '',
      ...data,
      armorUsed: compact([armorUsed]),
      reduceAVbyDV: false,
      substance: this.payload,
      damageType: HealthType.Physical,
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
      areaEffect: AreaEffectType.Cone,
    };
  }

  @LazyGetter()
  get payload() {
    const payload = this.epFlags?.payload;
    return payload
      ? new Substance({
          data: payload,
          embedded: this.name,
          loaded: true,
          updater: this.updater.prop('flags', EP.Name, 'payload').nestedStore(),
          deleteSelf: () => this.removePayload(),
        })
      : null;
  }

  get range() {
    return this.epData.range;
  }

  setPayload(payload: Substance) {
    return this.updatePayload(payload.getDataCopy(true));
  }

  removePayload() {
    return this.updatePayload(null);
  }

  private get updatePayload() {
    return this.updater.prop('flags', EP.Name, 'payload').commit;
  }
}
