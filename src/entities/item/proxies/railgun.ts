import {
  createBaseAttackFormula,
  KineticWeaponAttack,
  KineticWeaponAttackData,
} from '@src/combat/attacks';
import type { ItemType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import type { Attacker } from '../item-interfaces';
import { Equippable, Gear, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Railgun> {}
export class Railgun
  extends mix(Base).with(Purchasable, Gear, Equippable)
  implements Attacker<KineticWeaponAttackData, KineticWeaponAttack> {
  constructor(init: ItemProxyInit<ItemType.Railgun>) {
    super(init);
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
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
    };
  }

  get accessories() {
    return this.epData.accessories;
  }
}
