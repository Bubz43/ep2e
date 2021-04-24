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
import {
  CommonInterval,
  createLiveTimeState,
  currentWorldTimeMS,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { HealthType } from '@src/health/health';
import { nonNegative } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { clamp, compact, difference } from 'remeda';
import type { Attacker } from '../item-interfaces';
import {
  Copyable,
  Equippable,
  Gear,
  Purchasable,
  RangedWeapon,
} from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Railgun> {
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

  get fullType() {
    return this.isSingleUse
      ? `${localize('singleUse')} - ${super.type}`
      : super.type;
  }

  get canFire() {
    return !!this.availableShots;
  }

  get range() {
    return this.epData.range;
  }

  swapBattery() {
    return this.updateCharge({ charge: this.battery.max });
  }

  updateCharge(changed: Partial<Omit<Railgun['battery'], 'recharge'>>) {
    const max = changed.max ?? this.battery.max;
    const charge = changed.charge ?? this.battery.charge;
    const diff = max - charge;
    return this.updater.path('data', 'battery').commit({
      ...changed,
      recharge: (diff / max) * CommonInterval.Hour * 4 + currentWorldTimeMS(),
    });
  }

  get fullyCharged() {
    return this.totalCharge === this.battery.max;
  }

  get fullyLoaded() {
    const { max, value } = this.ammoState;
    return value === max + 1;
  }

  reload() {
    return this.updater
      .path('data', 'ammo', 'value')
      .commit((current) => this.ammoState.max + (current ? 1 : 0));
  }

  fire(shots: number) {
    this.updater
      .path('data', 'ammo', 'value')
      .store((current) => nonNegative(current - shots));
    return this.updateCharge({ charge: this.totalCharge - shots });
  }

  get availableShots() {
    return Math.min(this.epData.ammo.value, this.totalCharge);
  }

  setSingleUseSpent(spent: boolean) {
    this.updater.path('data', 'state', 'used').commit(spent);
  }

  @LazyGetter()
  get ammoState() {
    return {
      ...this.epData.ammo,
      hasChamber: true,
    };
  }

  get battery() {
    return this.epData.battery;
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
      if (shapeData.flags.ep2e?.transformation) {
        shapeData.flags.ep2e.transformation = null;
      }
      shapeData.data.state = {
        ...this.epData.state,
        ...shapeData.data.state,
        equipped: this.equipped,
      };
      this.updater.path('').store(shapeData);

      const myData = {
        ...this.getDataCopy(false),
        name: this.shapeName,
      };
      myData.data.state = shapeData.data.state;
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
