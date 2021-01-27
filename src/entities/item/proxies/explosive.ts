import type {
  DamageMessageData,
  AttackTraitData,
  SubstanceUseData,
  MessageAreaEffectData,
  MessageData,
} from '@src/chat/message-data';
import {
  createBaseAttackFormula,
  ExplosiveAttack,
  ExplosiveAttackData,
} from '@src/combat/attacks';
import {
  AreaEffectType,
  Demolition,
  ExplosiveSize,
  ExplosiveType,
  SubstanceType,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import type { ExplosiveSettings } from '@src/entities/weapon-settings';
import { UpdateStore } from '@src/entities/update-store';
import { currentWorldTimeMS } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { deepMerge, toTuple } from '@src/foundry/misc-helpers';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { EP } from '@src/foundry/system';
import { HealthType } from '@src/health/health';
import { notEmpty } from '@src/utility/helpers';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { compact, createPipe, equals, omit } from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Copyable, Purchasable, Stackable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Substance } from './substance';

class Base extends ItemProxyBase<ItemType.Explosive> {
  get updateState() {
    return this.updater.path('data', 'state');
  }
  get updateQuantity() {
    return this.updater.path('data');
  }
}

export class Explosive
  extends mix(Base).with(Purchasable, Copyable, Stackable)
  implements Attacker<ExplosiveAttackData, ExplosiveAttack> {
  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.Explosive> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }

  get fullName() {
    return `${this.name} (${this.quantity}) ${
      this.canContainSubstance
        ? `[${this.substance?.name || localize('empty')}]`
        : ''
    }`;
  }

  get isMissile() {
    return this.explosiveType === ExplosiveType.Missile;
  }

  get isGrenade() {
    return this.explosiveType === ExplosiveType.Grenade;
  }

  @LazyGetter()
  get substance() {
    const substanceData = this.epFlags?.substance?.[0];
    return substanceData
      ? new Substance({
          data: substanceData,
          embedded: this.name,
          loaded: true,
          updater: new UpdateStore({
            getData: () => substanceData,
            isEditable: () => this.editable,
            setData: createPipe(
              deepMerge(substanceData),
              toTuple,
              this.updateSubstance,
            ),
          }),
          deleteSelf: () => this.removeSubstance(),
        })
      : null;
  }

  @LazyGetter()
  get attacks() {
    return {
      primary: this.setupAttack(
        this.epData.primaryAttack,
        localize('primaryAttack'),
      ),
      secondary: this.hasSecondaryMode
        ? this.setupAttack(
            this.epData.secondaryAttack,
            localize('secondaryAttack'),
          )
        : null,
    };
  }

  setupAttack(
    { label, damageFormula, armorUsed, ...data }: ExplosiveAttackData,
    defaultLabel: string,
  ): ExplosiveAttack {
    const { areaEffect, areaEffectRadius } = this;
    return {
      armorUsed: compact([armorUsed]),
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
      reduceAVbyDV: false,
      label: this.hasSecondaryMode ? label || defaultLabel : '',
      areaEffect,
      areaEffectRadius,
      damageType: HealthType.Physical,
      substance: this.canContainSubstance ? this.substance : null,
      ...data,
    };
  }

  get canContainSubstance() {
    return !!this.epData.useSubstance;
  }

  get hasSecondaryMode() {
    return this.epData.hasSecondaryMode;
  }

  get areaEffect() {
    return this.epData.areaEffect;
  }

  get areaEffectRadius() {
    return this.epData.areaEffectRadius;
  }

  get explosiveType() {
    return this.epData.explosiveType;
  }

  get size() {
    return this.epData.size;
  }

  get sticky() {
    return this.epData.sticky;
  }

  get fullType() {
    return this.explosiveType === ExplosiveType.Generic
      ? localize(this.type)
      : this.formattedSize;
  }

  get formattedSize() {
    if (this.explosiveType === ExplosiveType.Missile) {
      switch (this.size) {
        case ExplosiveSize.Micro:
          return localize('micromissile');
        case ExplosiveSize.Mini:
          return localize('minimissile');
        case ExplosiveSize.Standard:
          return localize('standardMissile');
      }
    }
    if (this.explosiveType === ExplosiveType.Grenade) {
      switch (this.size) {
        case ExplosiveSize.Micro:
        case ExplosiveSize.Mini:
          return localize('minigrenade');

        case ExplosiveSize.Standard:
          return localize('standardGrenade');
      }
    }
    return '';
  }

  setSubstance(substance: Substance) {
    return this.updateSubstance([substance.getDataCopy()]);
  }

  removeSubstance() {
    return this.updateSubstance(null);
  }

  private get updateSubstance() {
    return this.updater.path('flags', EP.Name, 'substance').commit;
  }

  private static readonly commonGetters: ReadonlyArray<keyof Explosive> = [
    'name',
    'quality',
    'description',
    'cost',
    'isBlueprint',
    'size',
    'sticky',
  ];

  isSameAs(explosive: Explosive) {
    return (
      Explosive.commonGetters.every((prop) =>
        equals(this[prop], explosive[prop]),
      ) &&
      equals(
        omit(this.epData, ['blueprint', 'quantity', 'state']),
        omit(explosive.epData, ['blueprint', 'quantity', 'state']),
      ) &&
      equals(this.epFlags, explosive.epFlags)
    );
  }

  detonationMessageData(settings: ExplosiveSettings): MessageData {
    const {
      attackType = 'primary',
      centeredReduction,
      uniformBlastRadius,
      templateIDs,
      demolition,
    } = settings;

    const {
      rollFormulas,
      damageType,
      armorPiercing,
      armorUsed,
      reduceAVbyDV,
      substance,
      attackTraits,
      duration,
      notes,
      attackTraitNotes,
    } = this.attacks[attackType] || this.attacks.primary;

    // TODO apply demolition effects

    const damage: DamageMessageData | undefined = notEmpty(rollFormulas)
      ? {
          damageType,
          armorPiercing,
          armorUsed,
          reduceAVbyDV,
          rolledFormulas: rollLabeledFormulas(rollFormulas),
          source: this.name,
          notes,
        }
      : undefined;

    const attackTraitInfo: AttackTraitData | undefined = notEmpty(attackTraits)
      ? {
          traits: attackTraits,
          duration,
          notes: attackTraitNotes,
          startTime: duration ? currentWorldTimeMS() : undefined,
          source: this.name,
        }
      : undefined;

    const substanceUse: SubstanceUseData | undefined = substance
      ? {
          substance: substance.getDataCopy(),
          useMethod:
            substance.substanceType === SubstanceType.Chemical
              ? 'use'
              : this.epData.useSubstance || substance.applicationMethods[0]!,
          doses: this.epData.dosesPerUnit,
          showHeader: true,
        }
      : undefined;

    const areaEffect: MessageAreaEffectData | undefined =
      this.areaEffect === AreaEffectType.Centered
        ? {
            type: this.areaEffect,
            dvReduction: centeredReduction || -2,
            templateIDs,
            duration,
            startTime: duration ? currentWorldTimeMS() : undefined,
            angle:
              demolition?.type === Demolition.ShapeCentered
                ? demolition.angle
                : undefined,
          }
        : this.areaEffect === AreaEffectType.Uniform
        ? {
            type: this.areaEffect,
            radius: uniformBlastRadius || this.areaEffectRadius || 1,
            templateIDs,
            duration,
            startTime: duration ? currentWorldTimeMS() : undefined,
          }
        : undefined;

    return {
      areaEffect,
      damage,
      attackTraitInfo,
      substanceUse,
    };
  }
}
