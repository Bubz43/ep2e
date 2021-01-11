import type { AreaEffect } from '@src/combat/area-effect';
import type { BasicAreaEffectData } from '@src/combat/attack-formatting';
import type { AttackTrait, PoolType } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import type { SubstanceUseMethod } from '@src/entities/item/proxies/substance';
import type { ItemEntity } from '@src/entities/models';
import type { ArmorType } from '@src/features/active-armor';
import type { PreTestPoolAction } from '@src/features/pool';
import type { PlacedTemplateIDs } from '@src/foundry/canvas';
import type { RolledFormula } from '@src/foundry/rolls';
import type { HealthModification, HealthType } from '@src/health/health';
import type { RollMultiplier } from '@src/health/health-changes';
import type { StressType } from '@src/health/mental-health';
import type { SuccessTestModifier, SuccessTestResult } from '@src/success-test/success-test';
import type { RequireAtLeastOne } from 'type-fest';
import type { ExplosiveSettings, MeleeWeaponSettings } from '../entities/weapon-settings';

export type StressTestMessageData = {
  rolledFormulas: RolledFormula[];
  minStress: '' | 'half' | number;
  stressType: StressType | '';
  notes?: string;
  source?: string;
};

export type DamageMessageData = {
  rolledFormulas: RolledFormula[];
  damageType: HealthType;
  source: string;
  armorPiercing?: boolean;
  reduceAVbyDV?: boolean;
  armorUsed?: ArmorType[];
  cumulativeDotID?: string;
  multiplier?: RollMultiplier;
  areaEffect?: BasicAreaEffectData;
  notes?: string;
};

export type MessageHealData = RequireAtLeastOne<
  {
    source: string;
    damageFormulas?: RolledFormula[];
    wounds?: number;
    healthType: HealthType;
  },
  'damageFormulas' | 'wounds'
>;

export type HealthChangeMessageData = HealthModification & {
  healthType: HealthType;
  killing?: boolean;
  biological?: boolean;
  reducedArmor?: Partial<Record<ArmorType, number>>;
};

export type SubstanceUseData = {
  substance: ItemEntity<ItemType.Substance>;
  useMethod: SubstanceUseMethod;
  doses?: number;
  appliedTo?: string[];
  hidden?: boolean;
  showHeader?: boolean;
};

export type UsedExplosiveState = [
  'detonated' | 'reclaimed' | 'defused',
  string,
];

export type ExplosiveMessageData = ExplosiveSettings & {
  explosive: ItemEntity<ItemType.Explosive>;
  state?: null | UsedExplosiveState;
};

export type MeleeWeaponMessageData = MeleeWeaponSettings & {
  weapon: ItemEntity<ItemType.MeleeWeapon>;
  appliedCoating?: boolean;
  appliedPayload?: boolean;
  // TODO maybe additional info for tracking coating state etc
}

export type AttackTraitData = {
  traits: AttackTrait[];
  duration?: number;
  notes?: string;
  startTime?: number;
};

export type MessageHeaderData = {
  heading: string;
  subheadings?: string | string[];
  img?: string;
  description?: string;
  hidden?: boolean;
};

export type MessageAreaEffectData = AreaEffect & {
  templateIDs?: PlacedTemplateIDs | null;
};

export type SuccessTestMessage = {
  parts: SuccessTestModifier[];
  roll?: number | null;
  target: number;
  result?: SuccessTestResult | null;
  defaulting?: boolean;
  preTestPool?: [pool: PoolType, action: PreTestPoolAction] | null;
}

export type MessageData = Partial<{
  header: MessageHeaderData;
  areaEffect: MessageAreaEffectData;
  stress: StressTestMessageData;
  damage: DamageMessageData;
  attackTraitInfo: AttackTraitData;
  healthChange: HealthChangeMessageData;
  explosiveUse: ExplosiveMessageData;
  meleeAttack: MeleeWeaponMessageData;
  heal: MessageHealData;
  substanceUse: SubstanceUseData;
  fromMessageId: string;
  successTest: SuccessTestMessage;
}>;
