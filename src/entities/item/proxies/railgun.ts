import {
  createBaseAttackFormula,
  KineticWeaponAttack,
  KineticWeaponAttackData,
} from '@src/combat/attacks';
import {
  enumValues,
  RangedWeaponAccessory,
  RangedWeaponTrait,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { uniqueStringID } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { HealthType } from '@src/health/health';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact, difference } from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Copyable, Equippable, Gear, Purchasable, RangedWeapon } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Railgun> {
  get weaponTraits() {
    const { long, fixed } = this.epData;
    return compact([
      long && RangedWeaponTrait.Long,
      fixed && RangedWeaponTrait.Fixed,
    ]);
  }
}
export class Railgun
  extends mix(Base).with(Purchasable, Gear, Equippable, RangedWeapon, Copyable)
  implements Attacker<KineticWeaponAttackData, KineticWeaponAttack> {
  static readonly possibleAccessories = difference(
    enumValues(RangedWeaponAccessory),
    [
      RangedWeaponAccessory.ExtendedMagazine,
      RangedWeaponAccessory.FlashSuppressor,
      RangedWeaponAccessory.Silencer,
      RangedWeaponAccessory.SmartMagazine,
    ],
  );

  readonly nestedShape;

  constructor({
    nestedShape,
    ...init
  }: ItemProxyInit<ItemType.Railgun> & { nestedShape: boolean }) {
    super(init);
    this.nestedShape = nestedShape;
  }

  get fullName() {
    return `${this.name} ${this.shapeChanging ? `(${this.shapeName})` : ''}`;
  }

  @LazyGetter()
  get ammoState() {
    return {
      ...this.epData.ammo,
      hasChamber: true,
    };
  }

  get batteryState() {
    return this.epData.battery;
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
    return {
      armorUsed: [ArmorType.Kinetic],
      armorPiercing: true,
      reduceAVbyDV: false,
      ...data,
      label: '',
      damageType: HealthType.Physical,
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
      specialAmmo: null,
    };
  }

  @LazyGetter()
  get shapes() {
    return new Map(
      (this.epFlags?.shapes || []).map(
        (shape) =>
          [
            shape._id,
            new Railgun({
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
      this.updater.prop('').store(shapeData);

      const myData = {
        ...this.getDataCopy(false),
        name: this.shapeName,
      };
      myData.data = {
        ...myData.data,
        shapeChanging: true,
        shapeName: this.shapeName,
      };
      this.updater.prop('flags', EP.Name, 'shapes').commit((items) => {
        const changed = [...(items || [])];
        const _id = uniqueStringID(changed.map((i) => i._id));
        const { shapes, ...flags } = myData.flags.ep2e || {};

        changed.push({ ...myData, _id, flags: { [EP.Name]: flags } });
        const index = changed.findIndex((s) => s._id === shape.id);
        if (index !== -1) changed.splice(index, 1);

        return changed;
      });
    }
  }

  addShape(weaponData: ReturnType<Railgun['getDataCopy']>) {
    const { shapes, ...flags } = weaponData.flags.ep2e || {};
    weaponData.data = {
      ...weaponData.data,
      shapeChanging: true,
      shapeName: weaponData.name,
      wareType: this.wareType,
      description: this.description,
      ...this.cost,
    };
    return this.updater.prop('flags', EP.Name, 'shapes').commit((items) => {
      const changed = [...(items || [])];
      const _id = uniqueStringID(changed.map((i) => i._id));
      changed.push({ ...weaponData, _id, flags: { [EP.Name]: flags } });

      return changed;
    });
  }

  removeShape(id: string) {
    return this.updater.prop('flags', EP.Name, 'shapes').commit((items) => {
      const changed = [...(items || [])];
      const index = changed.findIndex((s) => s._id === id);
      if (index !== -1) changed.splice(index, 1);
      return changed;
    });
  }
}
