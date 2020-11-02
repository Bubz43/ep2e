import type { AttackTrait } from "@src/data-enums";
import type { ArmorType } from "@src/features/armor";
import type { ConditionEffect } from "@src/features/conditions";
import type { HealthType } from "@src/health/health";


export type SleightAttackData = {
  damageFormula: string;
  mentalArmor: boolean;
  perTurn: boolean;
  attackTraits: AttackTrait[];
  damageType: HealthType;
  applyConditions: ConditionEffect;
  notes: string;
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