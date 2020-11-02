import type { AreaEffectType, AttackTrait, FirearmAmmoModifierType } from "@src/data-enums";
import type { ArmorType } from "@src/features/armor";
import type { ConditionEffect } from "@src/features/conditions";
import type { FiringMode } from "@src/features/firing-modes";
import type { HealthType } from "@src/health/health";

type FiringModeList = {
  /**
   * @minItems 1
   */
  firingModes: FiringMode[];
}

export type SleightAttackData = {
  damageFormula: string;
  mentalArmor: boolean;
  perTurn: boolean;
  attackTraits: AttackTrait[];
  damageType: HealthType;
  applyConditions: ConditionEffect;
  notes: string;
}

export type SoftwareAttackData = {
  label: string;
  damageFormula: string;
  damageType: HealthType;
  attackTraits: AttackTrait[];
  meshArmor?: boolean;
  armorPiercing: boolean;
  reduceAVbyDV: boolean;
  applyConditions: ConditionEffect;
}

export type SubstanceAttackData = {
  damageFormula: string;
  armorUsed: ArmorType[];
  attackTraits: AttackTrait[];
  armorPiercing: boolean;
  reduceAVbyDV: boolean;
  damageType: HealthType;
  perTurn: boolean;
  
}

export type ExplosiveAttackData = {
  label: string;
  damageFormula: string;
  armorUsed: "" | ArmorType.Energy | ArmorType.Kinetic;
  attackTraits: AttackTrait[];
  duration: number;
  notes: string;
}

export type MeleeWeaponAttackData = {
  label: string;
  damageFormula: string;
  attackTraits: AttackTrait[];
  armorPiercing: boolean;
  notes: string;
}

export type ThrownWeaponAttackData = {
  damageFormula: string;
  attackTraits: AttackTrait[];
  armorPiercing: boolean;
  notes: string;
}

export type SprayWeaponAttackData = FiringModeList & {
  damageFormula: string;
  attackTraits: AttackTrait[];
  armorUsed: "" | ArmorType.Energy | ArmorType.Kinetic;
  superiorSuccessDot: string;
  armorPiercing: boolean;
  notes: string;
}

export type KineticWeaponAttackData = FiringModeList & {
  damageFormula: string;
  notes: string;
}

export type FirearmAmmoModeData = {
  damageModifierType: FirearmAmmoModifierType;
  damageFormula: string;
  armorPiercing: boolean;
  steady: boolean;
  attackTraits: AttackTrait[];
  notes: string;
  name: string;
}

export type BeamWeaponAttackData = FiringModeList & {
  label: string;
  damageFormula: string;
  attackTraits: AttackTrait[];
  notes: string;
  armorPiercing: boolean;
  areaEffect: AreaEffectType | "";
  areaEffectRadius: number;
}

