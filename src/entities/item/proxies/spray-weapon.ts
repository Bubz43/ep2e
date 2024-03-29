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
import { localize } from '@src/foundry/localization';
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
  get updateState() {
    return this.updater.path('system', 'state');
  }
}
export class SprayWeapon
  extends mix(Base).with(Gear, Purchasable, Equippable, RangedWeapon, Copyable)
  implements Attacker<SprayWeaponAttackData, SprayWeaponAttack>
{
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

  get fullName() {
    return this.singleUseSpent
      ? `[${localize('spent')}] ${this.name}`
      : this.name;
  }

  get fullType() {
    return this.isSingleUse
      ? `${localize('singleUse')} - ${super.fullType}`
      : super.fullType;
  }

  get canFire() {
    return !!this.availableShots;
  }

  fire(shots: number) {
    return this.spendAmmo(shots);
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

  setSingleUseSpent(spent: boolean) {
    this.updater.path('system', 'state', 'used').commit(spent);
  }

  shouldApplyCoating(firedShots: number) {
    return firedShots <= this.coatedShots;
  }

  reloadStandardAmmo() {
    return this.updater
      .path('system', 'ammo', 'value')
      .commit(this.ammoState.max);
  }

  updateAmmoValue(newValue: number) {
    return this.payloadUse === SprayPayload.FirePayload
      ? this.payload?.updater.path('system', 'quantity').commit(newValue)
      : this.updater.path('system', 'ammo', 'value').commit(newValue);
  }

  spendAmmo(amount: number) {
    const { payloadUse, payload } = this;
    if (
      payloadUse &&
      payload &&
      (payloadUse !== SprayPayload.CoatAmmunition ||
        this.shouldApplyCoating(amount))
    ) {
      payload.updater
        .path('system', 'quantity')
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
      .path('system', 'ammo', 'value')
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
          updater: this.updater.path('flags', EP.Name, 'payload').nestedStore(),
          deleteSelf: () => this.removePayload(),
        })
      : null;
  }

  get range() {
    return this.epData.range;
  }

  setPayload(payload: Substance | Substance['data']) {
    return this.updatePayload(
      payload instanceof Substance ? payload.getDataCopy(true) : payload,
    );
  }

  removePayload() {
    return this.updatePayload(null);
  }

  private get updatePayload() {
    return this.updater.path('flags', EP.Name, 'payload').commit;
  }

  get exoticSkillName() {
    return this.epFlags?.exoticSkill;
  }
}
