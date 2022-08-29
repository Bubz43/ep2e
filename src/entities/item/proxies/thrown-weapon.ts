import {
  createBaseAttackFormula,
  ThrownWeaponAttack,
  ThrownWeaponAttackData,
} from '@src/combat/attacks';
import type { ItemType } from '@src/entities/entity-types';
import { UpdateStore } from '@src/entities/update-store';
import { ArmorType } from '@src/features/active-armor';
import { EP } from '@src/foundry/system';
import { HealthType } from '@src/health/health';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import type { Attacker } from '../item-interfaces';
import { Copyable, Gear, Purchasable, Stackable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Substance } from './substance';

class Base extends ItemProxyBase<ItemType.ThrownWeapon> {
  get updateState() {
    return this.updater.path('system', 'state');
  }
  get updateQuantity() {
    return this.updater.path('system');
  }
}
export class ThrownWeapon
  extends mix(Base).with(Purchasable, Stackable, Copyable, Gear)
  implements Attacker<ThrownWeaponAttackData, ThrownWeaponAttack>
{
  constructor(init: ItemProxyInit<ItemType.ThrownWeapon>) {
    super(init);
  }

  get exoticSkillName() {
    return this.epData.exoticSkill;
  }

  get isTwoHanded() {
    return this.epData.twoHanded;
  }

  get attacks() {
    return {
      primary: this.setupAttack(this.epData.primaryAttack),
      secondary: null,
    };
  }

  get fullName() {
    return `${this.name} (${this.quantity})`;
  }

  setupAttack({
    damageFormula,
    ...data
  }: ThrownWeaponAttackData): ThrownWeaponAttack {
    return {
      ...data,
      armorUsed: [ArmorType.Kinetic],
      reduceAVbyDV: false,
      label: '',
      coating: this.coating,
      damageType: HealthType.Physical,
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
    };
  }

  @LazyGetter()
  get coating() {
    const substance = this.epFlags?.coating?.[0];
    return substance
      ? new Substance({
          data: substance,
          embedded: this.name,
          loaded: true,
          updater: new UpdateStore({
            getData: () => substance,
            isEditable: () => this.editable,
            setData: (changed) => {
              this.updater
                .path('flags', EP.Name, 'coating')
                .commit([mergeObject(substance, changed, { inplace: false })]);
            },
          }),
          deleteSelf: () => this.removeCoating(),
        })
      : null;
  }

  setCoating(substance: Substance | ReturnType<Substance['getDataCopy']>) {
    const substanceData =
      substance instanceof Substance ? substance.getDataCopy() : substance;
    substanceData.system = { ...substanceData.system, quantity: 1 };
    this.updater.path('flags', EP.Name, 'coating').commit([substanceData]);
  }

  removeCoating() {
    return this.updater.path('flags', EP.Name, 'coating').commit(null);
  }
}
