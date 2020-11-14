import {
  createBaseAttackFormula,
  KineticWeaponAttack,
  KineticWeaponAttackData,
} from '@src/combat/attacks';
import { RangedWeaponTrait } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { clamp, compact, concat, identity, take, takeWhile } from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Equippable, Gear, Purchasable, RangedWeapon } from '../item-mixins';
import { FirearmAmmo } from './firearm-ammo';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Firearm> {
  get weaponTraits() {
    const { long, fixed } = this.epData;
    return compact([
      long && RangedWeaponTrait.Long,
      fixed && RangedWeaponTrait.Fixed,
    ]);
  }
}
export class Firearm
  extends mix(Base).with(Purchasable, Gear, Equippable, RangedWeapon)
  implements Attacker<KineticWeaponAttackData, KineticWeaponAttack> {
  constructor(init: ItemProxyInit<ItemType.Firearm>) {
    super(init);
  }

  updateAmmoCount(newValue: number) {
    const { max, value } = this.ammoState;
    this.updater
      .prop('data', 'ammo', 'value')
      .store(clamp(newValue, { min: 0, max: max + 1 }));
    return this.specialAmmo?.hasMultipleModes
      ? this.updater
          .prop('data', 'ammo', 'modeSettings')
          .commit(
            newValue < value
              ? take(newValue)
              : newValue > value
              ? concat(Array(newValue - value).fill(this.specialAmmoModeIndex))
              : identity,
          )
      : this.updater.commit();
  }

  get range() {
    return this.epData.range;
  }

  get ammoCapacity() {
    return this.magazineCapacity + 1;
  }

  get ammoClass() {
    return this.epData.ammo.ammoClass;
  }

  get specialAmmoModeIndex() {
    const { selectedModeIndex } = this.ammoData;
    const type = this.specialAmmo?.findMode(selectedModeIndex);
    return type ? selectedModeIndex : 0;
  }

  get ammoData() {
    return this.epData.ammo;
  }

  get availableShots() {
    if (this.specialAmmo?.hasMultipleModes) {
      const { specialAmmoModeIndex } = this;
      const { smart } = this.magazineModifiers;
      return smart
        ? this.getAmmoFormCount(specialAmmoModeIndex)
        : takeWhile(
            this.ammoData.modeSettings,
            (x) => x === specialAmmoModeIndex,
          ).length;
    }
    return this.ammoState.value;
  }

  get magazineCapacity() {
    const { max } = this.ammoData;
    const { extended, smart } = this.magazineModifiers;
    return extended === smart ? max : Math.ceil(max * (extended ? 1.5 : 0.5));
  }

  get ammoValue() {
    const { value, modeSettings } = this.epData.ammo;
    const { magazineCapacity, specialAmmo } = this;
    const base = specialAmmo?.hasMultipleModes ? modeSettings.length : value;
    return Math.min(base, magazineCapacity + 1);
  }

  get ammoState() {
    const { ammoClass } = this.epData.ammo;
    const { magazineCapacity, ammoValue } = this;
    return {
      value: ammoValue,
      max: magazineCapacity,
      ammoClass,
      hasChamber: true,
    };
  }

  @LazyGetter()
  get specialAmmo() {
    const ammo = this.epFlags?.specialAmmo;
    return ammo
      ? new FirearmAmmo({
          data: ammo,
          loaded: true,
          embedded: this.name,
          updater: this.updater
            .prop('flags', EP.Name, 'specialAmmo')
            .nestedStore(),
          deleteSelf: () => this.removeSpecialAmmo(),
        })
      : null;
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
    ...data
  }: KineticWeaponAttackData): KineticWeaponAttack {
    const { specialAmmo, specialAmmoModeIndex } = this;
    const ammoMode = specialAmmo?.findMode(specialAmmoModeIndex);
    return {
      armorUsed: [ArmorType.Kinetic],
      armorPiercing: false,
      reduceAVbyDV: false,
      ...data,
      label: '',
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
      specialAmmo: specialAmmo && ammoMode ? [specialAmmo, ammoMode] : null,
    };
  }

  setSpecialAmmo(ammo: FirearmAmmo) {
    const gained = this.gainedFromAmmo(ammo);
    if (ammo.hasMultipleModes) {
      this.updater
        .prop('data', 'ammo', 'modeSettings')
        .store(Array(gained).fill(0));
    }
    this.updater
      .prop('data', 'ammo')
      .store({ selectedModeIndex: 0, value: gained });
    return this.updateAmmo(ammo.getDataCopy(true));
  }

  removeSpecialAmmo() {
    return this.updateAmmo(null);
  }

  private gainedFromAmmo(ammo: FirearmAmmo) {
    return Math.min(this.magazineCapacity, ammo.quantity);
  }

  getAmmoFormCount(index: number) {
    return this.ammoData.modeSettings.reduce(
      (accum, modeIndex) => (accum += modeIndex === index ? 1 : 0),
      0,
    );
  }

  private get updateAmmo() {
    return this.updater.prop('flags', EP.Name, 'specialAmmo').commit;
  }
}
