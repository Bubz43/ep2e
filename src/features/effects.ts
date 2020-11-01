import type { PoolType, PoolEffectUsability, RechargeType, AptitudeType } from "@src/data-enums";
import type { HealthType, HealthStat } from "@src/health/health";
import type { HealthTick, DotOrHotTarget } from "@src/health/recovery";
import type { ActionSubtype } from "./actions";
import type { ArmorType } from "./armor";
import type { SkillType, FieldSkillType } from "./skills";
import type { Tag } from "./tags";

export enum UniqueEffectType {
  NoFlipFlop = "noFlipFlop",
  AllowRemoteControl = "allowRemoteControl",
  Modular = "modular",
}

export enum EffectType {
  Initiative = "initiative",
  Pool = "pool",
  Misc = "misc",
  SuccessTest = "successTest",
  Health = "health",
  HealthRecovery = "healthRecovery",
  Armor = "armor",
  Recharge = "recharge",
  Duration = "duration",
  Melee = "melee",
  Ranged = "ranged",
  Skill = "skill",
  // TODO Unique Toggles (disable distracted, no flip-flop)
  // TODO Vision MISC
  // TODO Limb / add extra/convert existing to prehensile
  // TODO Skill  with SkillType and Aptitude Multiplier and Points
}

export type InitiativeEffect = {
  type: EffectType.Initiative;
  modifier: number;
};

export type PoolEffect = {
  type: EffectType.Pool;
  pool: Exclude<PoolType, PoolType.Threat>;
  modifier: number;
  usabilityModification: "" | PoolEffectUsability;
};

export type SuccessTestEffect = {
  type: EffectType.SuccessTest;
  tags: Tag[];
  modifier: number;
  requirement: string;
  toOpponent: boolean;
};

export type MiscEffect = {
  type: EffectType.Misc;
  unique: "" | UniqueEffectType;
  description: string;
};

export type HealthEffect = {
  type: EffectType.Health;
  health: HealthType;
  stat: HealthStat;
  modifier: number;
};

export type MeleeEffect = {
  type: EffectType.Melee;
  dvModifier: string;
};

export type RangedEffect = {
  type: EffectType.Ranged;
  negativeRangeModifiersMultiplier: number;
};

export type HealthRecoveryEffect = Omit<
  HealthTick,
  "lastUnaidedTick" | "lastAidedTick"
> & {
  stat: DotOrHotTarget;
  technologicallyAided: boolean;
  type: EffectType.HealthRecovery;
};

export type ArmorEffect = Record<ArmorType, number> & {
  type: EffectType.Armor;
  layerable: boolean;
};

export type DurationEffect = {
  type: EffectType.Duration;
  subtype: DurationEffectTarget;
  modifier: number;
  taskType: ActionSubtype | "";
  halve: boolean;
};

export enum RechargeStat {
  MaxUses = "maxUses",
  Duration = "duration",
  PoolsRecovered = "poolsRecovered",
}

export type RechargeEffect = {
  type: EffectType.Recharge;
  recharge: RechargeType;
  stat: RechargeStat;
  modifier: number;
};

export enum DurationEffectTarget {
  EffectDuration = "effectDuration",
  TaskActionTimeframe = "taskActionTimeframe",
  Drugs = "drugOrToxin",
  HealingTimeframes = "healingTimeframes",
}

export type SkillEffect = {
  skillType: SkillType | FieldSkillType;
  field: string;
  specialization: string;
  type: EffectType.Skill;
  total: number;
  aptitudeMultiplier: number;
  linkedAptitude: AptitudeType;
};

export type Effect =
  | InitiativeEffect
  | PoolEffect
  | MiscEffect
  | SuccessTestEffect
  | HealthEffect
  | ArmorEffect
  | RechargeEffect
  | DurationEffect
  | HealthRecoveryEffect
  | MeleeEffect
  | RangedEffect
  | SkillEffect;
