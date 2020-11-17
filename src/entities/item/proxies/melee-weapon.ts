import {
  createBaseAttackFormula,
  MeleeWeaponAttack,
  MeleeWeaponAttackData,
} from '@src/combat/attacks';
import type { ItemType } from '@src/entities/entity-types';
import { UpdateStore } from '@src/entities/update-store';
import { ArmorType } from '@src/features/active-armor';
import { localize } from '@src/foundry/localization';
import { deepMerge, toTuple } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { HealthType } from '@src/health/health';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { createPipe } from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Equippable, Gear, Purchasable } from '../item-mixins';
import { Explosive } from './explosive';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Substance } from './substance';

class MeleeWeaponBase extends ItemProxyBase<ItemType.MeleeWeapon> {}

export class MeleeWeapon
  extends mix(MeleeWeaponBase).with(Gear, Purchasable, Equippable)
  implements Attacker<MeleeWeaponAttackData, MeleeWeaponAttack> {
  constructor(init: ItemProxyInit<ItemType.MeleeWeapon>) {
    super(init);
  }

  get exoticSkillName() {
    return this.epData.exoticSkill;
  }

  get hasSecondaryAttack() {
    return this.epData.hasSecondaryAttack;
  }

  get augmentUnarmed() {
    return this.epData.augmentUnarmed;
  }

  get acceptsPayload() {
    return this.epData.acceptsPayload;
  }

  @LazyGetter()
  get attacks() {
    return {
      primary: this.setupAttack(
        this.epData.primaryAttack,
        localize('primaryAttack'),
      ),
      secondary: this.hasSecondaryAttack
        ? this.setupAttack(
            this.epData.secondaryAttack,
            localize('secondaryAttack'),
          )
        : null,
    };
  }

  setupAttack(
    { damageFormula, label, ...data }: MeleeWeaponAttackData,
    defaultLabel: string,
  ): MeleeWeaponAttack {
    return {
      armorUsed: [ArmorType.Kinetic],
      reduceAVbyDV: false,
      ...data,
      label: this.hasSecondaryAttack ? label || defaultLabel : '',
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
      coating: this.coating,
      payload: this.payload,
      damageType: HealthType.Physical,
    };
  }

  @LazyGetter()
  get payload() {
    const explosive = this.epFlags?.payload?.[0];
    return explosive
      ? new Explosive({
          data: explosive,
          embedded: this.name,
          loaded: true,
          updater: new UpdateStore({
            getData: () => explosive,
            isEditable: () => this.editable,
            setData: createPipe(
              deepMerge(explosive),
              toTuple,
              this.updatePayload,
            ),
          }),
          deleteSelf: () => this.removePayload(),
        })
      : null;
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
            setData: createPipe(
              deepMerge(substance),
              toTuple,
              this.updateCoating,
            ),
          }),
          deleteSelf: () => this.removeCoating(),
        })
      : null;
  }

  setCoating(substance: Substance | ReturnType<Substance['getDataCopy']>) {
    const substanceData =
      substance instanceof Substance ? substance.getDataCopy() : substance;
    substanceData.data = { ...substanceData.data, quantity: 1 };
    return this.updateCoating([substanceData]);
  }

  removeCoating() {
    return this.updateCoating(null);
  }

  setPayload(payload: Explosive) {
    return this.updatePayload([payload.getDataCopy()]);
  }

  removePayload() {
    return this.updatePayload(null);
  }

  private get updatePayload() {
    return this.updater.prop('flags', EP.Name, 'payload').commit;
  }

  private get updateCoating() {
    return this.updater.prop('flags', EP.Name, 'coating').commit;
  }
}
