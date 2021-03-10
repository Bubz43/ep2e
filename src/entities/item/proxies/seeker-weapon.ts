import {
  enumValues,
  RangedWeaponAccessory,
  RangedWeaponTrait,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact, difference } from 'remeda';
import {
  Copyable,
  Equippable,
  Gear,
  Purchasable,
  RangedWeapon,
} from '../item-mixins';
import { Explosive } from './explosive';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.SeekerWeapon> {
  get weaponTraits() {
    return enumValues(RangedWeaponTrait).filter((trait) => this.epData[trait]);
  }
  get updateState() {
    return this.updater.path('data', 'state');
  }
}

export class SeekerWeapon extends mix(Base).with(
  Purchasable,
  Equippable,
  Gear,
  RangedWeapon,
  Copyable,
) {
  static readonly possibleAccessories = difference(
    enumValues(RangedWeaponAccessory),
    [
      RangedWeaponAccessory.FlashSuppressor,
      RangedWeaponAccessory.Silencer,
      RangedWeaponAccessory.SmartMagazine,
    ],
  );
  constructor(init: ItemProxyInit<ItemType.SeekerWeapon>) {
    super(init);
  }

  get canFire() {
    return !!this.availableShots;
  }

  get firingMode() {
    return this.epData.firingMode;
  }

  get allowAlternativeAmmo() {
    return this.epData.hasAlternativeAmmo;
  }

  get primaryAmmo() {
    return this.epData.primaryAmmo;
  }

  get alternativeAmmo() {
    return this.epData.alternativeAmmo;
  }

  get isAlternativeMissiles() {
    return (
      this.allowAlternativeAmmo &&
      this.missiles?.size === this.alternativeAmmo.missileSize
    );
  }

  get activeAmmoSettings() {
    return this.isAlternativeMissiles ? this.alternativeAmmo : this.primaryAmmo;
  }

  get availableShots() {
    return Math.min(
      this.activeAmmoSettings.missileCapacity,
      this.missiles?.quantity || 0,
    );
  }

  get acceptableMissileSizes() {
    return compact([
      this.primaryAmmo.missileSize,
      this.allowAlternativeAmmo && this.alternativeAmmo.missileSize,
    ]);
  }

  get attacks() {
    return this.missiles?.attacks;
  }

  get currentCapacity() {
    const { capacityChanged, extended } = this.magazineModifiers;
    const { missileCapacity } = this.activeAmmoSettings;
    return capacityChanged && extended
      ? Math.ceil(missileCapacity * 1.5)
      : missileCapacity;
  }

  @LazyGetter()
  get missiles() {
    const data = this.epFlags?.missiles;
    return data
      ? new Explosive({
          data,
          embedded: this.name,
          loaded: true,
          updater: this.updater
            .path('flags', EP.Name, 'missiles')
            .nestedStore(),
          deleteSelf: () => this.removeMissiles(),
        })
      : null;
  }

  setMissiles(missiles: Explosive | Explosive['data']) {
    return this.updatePayload(
      missiles instanceof Explosive ? missiles.getDataCopy(true) : missiles,
    );
  }

  removeMissiles() {
    return this.updatePayload(null);
  }

  private get updatePayload() {
    return this.updater.path('flags', EP.Name, 'missiles').commit;
  }
}
