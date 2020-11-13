import type {
  AreaEffectType,
  AttackTrait,
  FirearmAmmoModifierType,
} from '@src/data-enums';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import type { Substance } from '@src/entities/item/proxies/substance';
import type { ArmorType } from '@src/features/active-armor';
import type { ConditionEffect } from '@src/features/conditions';
import type { FiringMode } from '@src/features/firing-modes';
import { localize } from '@src/foundry/localization';
import type { HealthType } from '@src/health/health';

type FiringModeList = {
  /**
   * @minItems 1
   */
  firingModes: FiringMode[];
};

export type LabeledFormula = { label: string; formula: string };

type FullAttack<T extends { damageFormula: string }> = Omit<
  T,
  'damageFormula' | "armorUsed"
> &
  UsedAttackArmor & {
  rollFormulas: LabeledFormula[];
  label: string;
  };

export const createBaseAttackFormula = (
  damageFormula: string,
): LabeledFormula => ({
  label: `${localize('base')} ${localize('damageValue')}`,
  formula: damageFormula,
});

export type UsedAttackArmor = {
  armorUsed: ArmorType[];
  armorPiercing: boolean;
  reduceAVbyDV: boolean;
};

export type SleightAttackData = {
  damageFormula: string;
  mentalArmor: boolean;
  perTurn: boolean;
  attackTraits: AttackTrait[];
  damageType: HealthType;
  applyConditions: ConditionEffect;
  notes: string;
};

export type SoftwareAttackData = Omit<UsedAttackArmor, 'armorUsed'> & {
  label: string;
  damageFormula: string;
  damageType: HealthType;
  attackTraits: AttackTrait[];
  meshArmor?: boolean;
  applyConditions: ConditionEffect;
};

export type SubstanceAttackData = UsedAttackArmor & {
  damageFormula: string;
  attackTraits: AttackTrait[];
  damageType: HealthType;
  perTurn: boolean;
};

export type SubstanceAttack = FullAttack<SubstanceAttackData>;
export type ExplosiveAttackData = {
  label: string;
  damageFormula: string;
  armorUsed: '' | ArmorType.Energy | ArmorType.Kinetic;
  armorPiercing: boolean;
  attackTraits: AttackTrait[];
  duration: number;
  notes: string;
};

export type ExplosiveAttack = FullAttack<ExplosiveAttackData> & {
  duration: number;
  substance?: Substance | null;
  areaEffect?: AreaEffectType | "";
  areaEffectRadius?: number;
}

export type MeleeWeaponAttackData = {
  label: string;
  damageFormula: string;
  attackTraits: AttackTrait[];
  armorPiercing: boolean;
  notes: string;
};

export type MeleeWeaponAttack = FullAttack<MeleeWeaponAttackData> & {
  coating?: Substance | null;
  payload?: Explosive | null;
};

export type ThrownWeaponAttackData = {
  damageFormula: string;
  attackTraits: AttackTrait[];
  armorPiercing: boolean;
  notes: string;
};

export type ThrownWeaponAttack = FullAttack<ThrownWeaponAttackData> & {
  coating?: Substance | null;
}

export type SprayWeaponAttackData = FiringModeList & {
  damageFormula: string;
  attackTraits: AttackTrait[];
  armorUsed: '' | ArmorType.Energy | ArmorType.Kinetic;
  superiorSuccessDot: string;
  armorPiercing: boolean;
  notes: string;
};

export type KineticWeaponAttackData = FiringModeList & {
  damageFormula: string;
  notes: string;
};

export type FirearmAmmoModeData = {
  damageModifierType: FirearmAmmoModifierType;
  damageFormula: string;
  armorPiercing: boolean;
  steady: boolean;
  attackTraits: AttackTrait[];
  notes: string;
  name: string;
};

export type BeamWeaponAttackData = FiringModeList & {
  label: string;
  damageFormula: string;
  attackTraits: AttackTrait[];
  notes: string;
  armorPiercing: boolean;
  areaEffect: AreaEffectType | '';
  areaEffectRadius: number;
};
