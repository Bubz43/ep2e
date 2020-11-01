import { enumValues } from '@src/data-enums';
import type { ActorType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { nonNegative, notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import { clamp, pipe } from 'remeda';
import { ActionSubtype } from './actions';

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

export class ActiveArmor extends Map<ArmorKey, number> {
  private positiveArmorSources = new Set<ArmorType>();

  // #layerPenalty?: AddEffects;

  // #overburdened?: AddEffects;

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

  get excessLayers() {
    return clamp(this.get('layers') - 1, { min: 0 });
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
    return value ? this.set(armor, this.get(armor) + value) : this;
  }

  addInherentShellArmor(
    inherent: Record<ArmorType.Energy | ArmorType.Kinetic, number>,
  ) {
    this.incrementLayers();
    for (const type of [ArmorType.Energy, ArmorType.Kinetic] as const) {
      this.set(type, this.get(type) + inherent[type]);
    }
  }

  // mitigateDamage({
  //   damage,
  //   armorUsed,
  //   armorPiercing: pierce = false,
  //   additionalArmor = 0,
  // }: Pick<DamageInfo, "damage" | "armorUsed" | "armorPiercing" | "additionalArmor">) {
  //   const remainingDamage = pipe(
  //     Math.round(damage),
  //     (damage) =>
  //       damage -
  //       ActiveArmor.maybePierced({ armorValue: additionalArmor, pierce }),
  //     nonNegative
  //   );
  //   if (!notEmpty(armorUsed)) return { appliedDamage: remainingDamage };

  //   const uniqueArmors = new Set(armorUsed);
  //   const damageSplit = Math.floor(remainingDamage / uniqueArmors.size);
  //   const remainder = remainingDamage % uniqueArmors.size;
  //   const instances = [...uniqueArmors].map(
  //     (armor, index) =>
  //       [armor, damageSplit + (index === 0 ? remainder : 0)] as const
  //   );

  //   const personalArmorUsed = new Map<ArmorType, number>();

  //   let appliedDamage = 0;
  //   for (const [armor, dv] of instances) {
  //     const armorValue = ActiveArmor.maybePierced({
  //       armorValue: this.get(armor),
  //       pierce,
  //     });
  //     const afterArmor = nonNegative(dv - armorValue);
  //     appliedDamage += afterArmor;
  //     personalArmorUsed.set(armor, dv - afterArmor);
  //   }

  //   return { appliedDamage, personalArmorUsed };
  // }

  // setupArmors({
  //   armorEffects,
  //   som,
  // }: {
  //   armorEffects: ReadonlyArray<ArmorEffect>;
  //   som: number | null;
  // }) {
  //   const armorTypes = enumValues(ArmorType);
  //   // TODO: List of armor notes for special resitancess
  //   for (const armorEffect of armorEffects) {
  //     if (!armorEffect.layerable) this.incrementLayers();
  //     for (const armor of armorTypes) {
  //       const value = armorEffect[armor];
  //       if (value > 0) this.positiveArmorSources.add(armor);
  //       this.addValue(armor, value);
  //     }
  //   }

  //   const effectsFromArmor: AddEffects[] = [];

  //   const { excessLayers, highestPhysicalArmor } = this;

  //   if (excessLayers > 0) {
  //     this.#layerPenalty = {
  //       source: `${localize("armorLayerPenalty")} x${excessLayers}`,
  //       effects: [
  //         createEffect.successTest({
  //           modifier: excessLayers * -20,
  //           tags: [{ type: TagType.Action, subtype: ActionSubtype.Physical, action: "" }],
  //         }),
  //       ],
  //     };
  //     effectsFromArmor.push(this.#layerPenalty);
  //   }

  //   if (som && highestPhysicalArmor > som) {
  //     this.#overburdened = {
  //       source: localize("overburdened"),
  //       effects: [
  //         createEffect.successTest({
  //           modifier: -20,
  //           tags: [{ type: TagType.Action, subtype: ActionSubtype.Physical, action: "" }],
  //         }),
  //         // TODO Halve movement
  //       ],
  //     };
  //     effectsFromArmor.push(this.#overburdened);
  //   }
  //   // TODO Encumbered

  //   return effectsFromArmor;
  // }

  get icon() {
    return localImage(
      `images/icons/armor/${
        this.excessLayers ? 'layered-armor' : 'shield'
      }.svg`,
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
