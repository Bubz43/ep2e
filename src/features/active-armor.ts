import { enumValues } from '@src/data-enums';
import type {
  AddEffects,
  ObtainableEffects,
} from '@src/entities/applied-effects';
import { localize } from '@src/foundry/localization';
import type { ArmorDamage } from '@src/health/health-changes';
import { nonNegative, notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import { clamp, pipe } from 'remeda';
import { ActionSubtype } from './actions';
import { ArmorEffect, createEffect, SourcedEffect } from './effects';
import { TagType } from './tags';

export enum ArmorType {
  Energy = 'energy',
  Kinetic = 'kinetic',
  Mental = 'mental',
  Mesh = 'mesh',
}

type ArmorKey = ArmorType | 'layers';

export type ReadonlyArmor = Omit<
  ActiveArmor,
  'setupArmors' | 'set' | 'delete' | 'clear'
>;

export class ActiveArmor
  extends Map<ArmorKey, number>
  implements ObtainableEffects {
  private positiveArmorSources = new Set<ArmorType>();
  private _layerPenalty?: AddEffects;
  private _overburdened?: AddEffects;
  readonly currentEffects: AddEffects[] = [];
  readonly reducedArmors = new Set<ArmorType>();
  concealable = true;

  constructor(
    public readonly sources: ReadonlyArray<SourcedEffect<ArmorEffect>>,
    som: number | null,
    public readonly damagedArmor?: ArmorDamage[] | null,
  ) {
    super();
    const armorTypes = enumValues(ArmorType);
    for (const source of sources) {
      if (!source.layerable) this.incrementLayers();
      if (this.concealable) this.concealable = source.concealable;
      for (const armor of armorTypes) {
        const value = source[armor];
        if (value > 0) this.positiveArmorSources.add(armor);
        this.addValue(armor, value);
      }
    }
    // TODO See if I should apply armor damage before or after getting highest physical armor
    if (notEmpty(damagedArmor)) {
      for (const damage of damagedArmor) {
        for (const armor of armorTypes) {
          this.addValue(armor, -damage[armor]);
        }
      }
    }

    const { excessLayers, highestPhysicalArmor } = this;

    if (excessLayers > 0) {
      this._layerPenalty = {
        source: `${localize('armorLayerPenalty')} x${excessLayers}`,
        effects: [
          createEffect.successTest({
            modifier: excessLayers * -20,
            tags: [
              {
                type: TagType.Action,
                subtype: ActionSubtype.Physical,
                action: '',
              },
            ],
          }),
        ],
      };
      this.currentEffects.push(this._layerPenalty);
    }

    if (som && highestPhysicalArmor > som) {
      this._overburdened = {
        source: localize('overburdened'),
        effects: [
          createEffect.successTest({
            modifier: -20,
            tags: [
              {
                type: TagType.Action,
                subtype: ActionSubtype.Physical,
                action: '',
              },
            ],
          }),
        ],
      };
      this.currentEffects.push(this._overburdened);
    }
  }

  static maybePierced({
    armorValue,
    pierce,
  }: {
    armorValue: number;
    pierce: boolean;
  }) {
    return Math.floor(pierce ? Math.round(armorValue / 2) : armorValue);
  }

  getClamped(key: ArmorType) {
    return nonNegative(this.get(key));
  }

  get(key: ArmorKey) {
    return super.get(key) || 0;
  }

  get layers() {
    return this.get('layers');
  }

  get excessLayers() {
    return clamp(this.layers - 1, { min: 0 });
  }

  get highestPhysicalArmor() {
    return Math.max(this.get(ArmorType.Energy), this.get(ArmorType.Kinetic));
  }

  get activeArmors() {
    return enumValues(ArmorType).flatMap((type) => {
      const value = this.get(type);
      return value ? { type, value } : [];
    });
  }

  private incrementLayers() {
    return this.set('layers', this.get('layers') + 1);
  }

  private addValue(armor: ArmorType, value: number) {
    if (value) this.set(armor, this.get(armor) + value);
    if (value < 0) this.reducedArmors.add(armor);
  }

  mitigateDamage({
    damage,
    armorUsed,
    armorPiercing: pierce = false,
    additionalArmor = 0,
  }: {
    damage: number;
    armorUsed: ArmorType[];
    armorPiercing: boolean;
    additionalArmor?: number;
  }) {
    const remainingDamage = pipe(
      Math.round(damage),
      (damage) =>
        damage -
        ActiveArmor.maybePierced({ armorValue: additionalArmor, pierce }),
      nonNegative,
    );
    if (armorUsed.length === 0) return { appliedDamage: remainingDamage };

    const uniqueArmors = new Set(armorUsed);
    const damageSplit = Math.floor(remainingDamage / uniqueArmors.size);
    const remainder = remainingDamage % uniqueArmors.size;
    const instances = [...uniqueArmors].map(
      (armor, index) =>
        [armor, damageSplit + (index === 0 ? remainder : 0)] as const,
    );

    const personalArmorUsed = new Map<ArmorType, number>();

    let appliedDamage = 0;
    for (const [armor, dv] of instances) {
      const armorValue = ActiveArmor.maybePierced({
        armorValue: this.get(armor),
        pierce,
      });
      const afterArmor = nonNegative(dv - armorValue);
      appliedDamage += afterArmor;
      personalArmorUsed.set(armor, dv - afterArmor);
    }
    console.log(appliedDamage);
    return { appliedDamage, personalArmorUsed };
  }

  get isOverburdened() {
    return !!this._overburdened;
  }

  isEncumbered(physicalDurability: number) {
    return this.highestPhysicalArmor > physicalDurability;
  }

  get icon() {
    return localImage(
      `icons/armor/${this.excessLayers ? 'layered-armor' : 'shield'}.svg`,
    );
  }

  static physicalTypes = [ArmorType.Energy, ArmorType.Kinetic];

  getArmorValues({ physical }: { physical: boolean }) {
    return enumValues(ArmorType).flatMap((type) =>
      this.positiveArmorSources.has(type) ||
      ActiveArmor.physicalTypes.includes(type) === physical
        ? { type, value: this.get(type) }
        : [],
    );
  }
}
