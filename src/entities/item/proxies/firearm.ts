import {
  createBaseAttackFormula,
  KineticWeaponAttack,
  KineticWeaponAttackData,
} from '@src/combat/attacks';
import { RangedWeaponTrait } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { UpdateStore } from '@src/entities/update-store';
import { ArmorType } from '@src/features/active-armor';
import { uniqueStringID } from '@src/features/feature-helpers';
import {
  CommonInterval,
  createLiveTimeState,
  currentWorldTimeMS,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { deepMerge, toTuple } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { HealthType } from '@src/health/health';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import {
  clamp,
  compact,
  concat,
  createPipe,
  identity,
  takeWhile,
} from 'remeda';
import type { Attacker } from '../item-interfaces';
import {
  Copyable,
  Equippable,
  Gear,
  Purchasable,
  RangedWeapon,
} from '../item-mixins';
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
  get updateState() {
    return this.updater.path('data', 'state');
  }
}
export class Firearm
  extends mix(Base).with(Purchasable, Gear, Equippable, RangedWeapon, Copyable)
  implements Attacker<KineticWeaponAttackData, KineticWeaponAttack> {
  readonly nestedShape;

  constructor({
    nestedShape,
    ...init
  }: ItemProxyInit<ItemType.Firearm> & { nestedShape: boolean }) {
    super(init);
    this.nestedShape = nestedShape;
  }

  get fullName() {
    return `${this.name} ${this.shapeChanging ? `(${this.shapeName})` : ''}`;
  }

  fire(shots: number) {
    return this.updateAmmoCount(this.ammoData.value - shots);
  }

  reloadStandardAmmo() {
    this.updateAmmoCount(this.ammoCapacity - (this.ammoValue ? 0 : 1));
  }

  updateAmmoCount(newValue: number) {
    const { max } = this.ammoState;
    const { value } = this.ammoData;
    this.updater
      .path('data', 'ammo', 'value')
      .store(clamp(newValue, { min: 0, max: max + 1 }));
    return this.specialAmmo?.hasMultipleModes
      ? this.updater
          .path('data', 'ammo', 'modeSettings')
          .commit(
            newValue < value
              ? (modes) => modes.slice(-newValue)
              : newValue > value
              ? concat(Array(newValue - value).fill(this.specialAmmoModeIndex))
              : identity,
          )
      : this.updater.commit();
  }

  get canFire() {
    return !!this.availableShots;
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

  get isSteady() {
    return !!this.attacks.primary.specialAmmo?.[1].steady;
  }

  @LazyGetter()
  get specialAmmo() {
    const ammo = this.epFlags?.specialAmmo?.[0];
    return ammo
      ? new FirearmAmmo({
          data: ammo,
          loaded: true,
          embedded: this.name,
          updater: new UpdateStore({
            getData: () => ammo,
            isEditable: () => this.editable,
            setData: createPipe(deepMerge(ammo), toTuple, this.updateAmmo),
          }),
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
      damageType: HealthType.Physical,
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
        .path('data', 'ammo', 'modeSettings')
        .store(Array(gained).fill(0));
    }
    this.updater
      .path('data', 'ammo')
      .store({ selectedModeIndex: 0, value: gained });
    return this.updateAmmo([ammo.getDataCopy(true)]);
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
    return this.updater.path('flags', EP.Name, 'specialAmmo').commit;
  }

  @LazyGetter()
  get shapes() {
    return new Map(
      (this.epFlags?.shapes || []).map(
        (shape) =>
          [
            shape._id,
            new Firearm({
              data: shape,
              embedded: this.name,
              nestedShape: true,
            }),
          ] as const,
      ),
    );
  }

  get shapeChanging() {
    return this.epData.shapeChanging;
  }

  get shapeName() {
    return this.epData.shapeName || localize(this.epData.ammo.ammoClass);
  }

  @LazyGetter()
  get transformTimer() {
    const transformation = this.epFlags?.transformation;
    if (!transformation) return null;
    const { startTime, shapeId } = transformation;
    const shape = this.shapes.get(shapeId);
    return createLiveTimeState({
      duration: CommonInterval.Turn * 3,
      startTime,
      label: `${this.shapeName} -> ${shape?.shapeName}`,
      id: this.id,
      updateStartTime: this.updater.path(
        'flags',
        EP.Name,
        'transformation',
        'startTime',
      ).commit,
    });
  }

  startShapeSwap(shapeId: string) {
    this.updater
      .path('flags', EP.Name, 'transformation')
      .commit({ startTime: currentWorldTimeMS(), shapeId });
  }

  cancelTransformation() {
    this.updater.path('flags', EP.Name, 'transformation').commit(null);
  }

  async swapShape(id: string) {
    const shape = this.shapes.get(id);
    if (shape) {
      const { name, id } = this;
      const shapeData = {
        ...shape.getDataCopy(false),
        name,
        _id: id,
      };
      shapeData.data = {
        ...shapeData.data,
        shapeChanging: true,
        wareType: this.wareType,
        description: this.description,
        ...this.cost,
      };

      shapeData.flags = {
        [EP.Name]: {
          specialAmmo: shape.epFlags?.specialAmmo || null,
          transformation: null,
        },
      };
      shapeData.data.state.equipped = this.equipped;

      this.updater.path('').store(shapeData);

      const myData = {
        ...this.getDataCopy(false),
        name: this.shapeName,
      };
      myData.data = {
        ...myData.data,
        shapeChanging: true,
        shapeName: this.shapeName,
      };
      this.updater.path('flags', EP.Name, 'shapes').commit((items) => {
        const changed = [...(items || [])];
        const _id = uniqueStringID(changed.map((i) => i._id));
        const { shapes, transformation, ...flags } = myData.flags.ep2e || {};

        changed.push({ ...myData, _id, flags: { [EP.Name]: flags } });
        const index = changed.findIndex((s) => s._id === shape.id);
        if (index !== -1) changed.splice(index, 1);

        return changed;
      });
    }
  }

  addShape(weaponData: ReturnType<Firearm['getDataCopy']>) {
    const { shapes, ...flags } = weaponData.flags.ep2e || {};
    weaponData.data = {
      ...weaponData.data,
      shapeChanging: true,
      shapeName: weaponData.name,
      wareType: this.wareType,
      description: this.description,
      ...this.cost,
    };

    return this.updater.path('flags', EP.Name, 'shapes').commit((items) => {
      const changed = [...(items || [])];
      const _id = uniqueStringID(changed.map((i) => i._id));
      changed.push({ ...weaponData, _id, flags: { [EP.Name]: flags } });

      return changed;
    });
  }

  removeShape(id: string) {
    return this.updater.path('flags', EP.Name, 'shapes').commit((items) => {
      const changed = [...(items || [])];
      const index = changed.findIndex((s) => s._id === id);
      if (index !== -1) changed.splice(index, 1);
      return changed;
    });
  }
}
