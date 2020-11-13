import {
  createBaseAttackFormula,
  KineticWeaponAttack,
  KineticWeaponAttackData,
} from '@src/combat/attacks';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import type { Attacker } from '../item-interfaces';
import { Equippable, Gear, Purchasable, RangedWeapon } from '../item-mixins';
import { FirearmAmmo } from './firearm-ammo';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Firearm> {}
export class Firearm
  extends mix(Base).with(Purchasable, Gear, Equippable, RangedWeapon)
  implements Attacker<KineticWeaponAttackData, KineticWeaponAttack> {
  constructor(init: ItemProxyInit<ItemType.Firearm>) {
    super(init);
  }

  get range() {
    return this.epData.range;
  }

  get ammoClass() {
    return this.epData.ammo.ammoClass
  }

  get isFixed() {
    return this.epData.fixed
  }

  get isLong() {
    return this.epData.long
  }

  get specialAmmoModeIndex() {
    const { selectedModeIndex } = this.ammoData
    const type = this.specialAmmo?.findMode(selectedModeIndex)
    return type ? selectedModeIndex : 0
  }

  get ammoData() {
    return this.epData.ammo
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
      armorPiercing: true,
      reduceAVbyDV: false,
      ...data,
      label: '',
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
      specialAmmo: specialAmmo && ammoMode ? [specialAmmo, ammoMode] : null
    };
  }

  setSpecialAmmo(ammo: FirearmAmmo) {
    const gained = this.gainedFromAmmo(ammo);
    if (ammo.hasMultipleModes) {
      this.updater.prop("data", "ammo", "modeSettings").store(Array(gained).fill(0));
    }
    this.updater.prop("data", "ammo").store({ selectedModeIndex: 0, value: gained })
    return this.updateAmmo(ammo.getDataCopy(true));
  }

  removeSpecialAmmo() {
    return this.updateAmmo(null);
  }

  private gainedFromAmmo(ammo: FirearmAmmo) {
    return Math.min(this.magazineCapacity, ammo.quantity);
  }

  private get updateAmmo() {
    return this.updater.prop('flags', EP.Name, 'specialAmmo').commit;
  }
}
