import type { AreaEffect } from '@src/combat/area-effect';
import type { BasicAreaEffectData } from '@src/combat/attack-formatting';
import type { AttackType } from '@src/combat/attacks';
import type {
  AttackTrait,
  CalledShot,
  PoolType,
  PsiPush,
  SuperiorResultEffect,
} from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import type { RangedWeapon } from '@src/entities/item/item';
import type { SubstanceUseMethod } from '@src/entities/item/proxies/substance';
import type { ItemEntity } from '@src/entities/models';
import type { ActiveTaskAction } from '@src/features/actions';
import type { ArmorType } from '@src/features/active-armor';
import type { AptitudeCheckInfo } from '@src/features/aptitude-check-result-info';
import type { FiringModeGroup } from '@src/features/firing-modes';
import type { PostTestPoolAction, PreTestPoolAction } from '@src/features/pool';
import type { InfluenceRoll } from '@src/features/psi-influence';
import type { Favor, RepIdentifier } from '@src/features/reputations';
import type { Size } from '@src/features/size';
import type { SpecialTest } from '@src/features/tags';
import type { PlacedTemplateIDs } from '@src/foundry/canvas';
import type {
  LabeledFormula,
  RollData,
  RolledFormula,
} from '@src/foundry/rolls';
import type { StressTestData } from '@src/foundry/template-schema';
import type { HealthModification, HealthType } from '@src/health/health';
import type { RollMultiplier } from '@src/health/health-changes';
import type { StressType } from '@src/health/mental-health';
import type { SuccessTestResult } from '@src/success-test/success-test';
import type { RequireAtLeastOne } from 'type-fest';
import type {
  ExplosiveSettings,
  MeleeWeaponSettings,
} from '../entities/weapon-settings';

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
    multiplier?: RollMultiplier;
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
  showHeader?: boolean;
};

export type MeleeWeaponMessageData = MeleeWeaponSettings & {
  weapon?: ItemEntity<ItemType.MeleeWeapon> | null;
  appliedCoating?: boolean;
  appliedPayload?: boolean;
  morphSize?: Size | null;
  damageModifiers?: LabeledFormula[];
};

export type ThrownWeaponMessageData = {
  weapon: ItemEntity<ItemType.ThrownWeapon>;
  appliedCoating?: boolean;
  damageModifiers?: LabeledFormula[];
  calledShot?: CalledShot | null;
};

export type HackMessageData = {
  software: ItemEntity<ItemType.Software>;
  attackType?: AttackType;
};

export type AttackTraitData = {
  traits: AttackTrait[];
  duration?: number;
  notes?: string;
  startTime?: number;
  source: string;
  testResult?: SuccessTestResult;
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
  duration?: number;
  startTime?: number;
  notes?: string;
};

type SuccessTestState = {
  roll?: number | null;
  target: number;
  result?: SuccessTestResult | null;
  action:
    | 'edit'
    | [pool: PoolType, action: PreTestPoolAction | PostTestPoolAction]
    | 'initial';
};

export type MessageTargets = { tokenId: string; sceneId: string }[];

export interface SuccessTestMessageData {
  parts: { name: string; value: number }[];
  states: SuccessTestState[];
  defaulting?: boolean;
  linkedPool?: Exclude<PoolType, PoolType.Flex | PoolType.Threat>;
  ignoredModifiers?: number;
  disableSuperiorEffects?: boolean;
  superiorResultEffects?: SuperiorResultEffect[];
  defaultSuperiorEffect?: SuperiorResultEffect;
  // TODO  criticalResultEffect?: CriticalResultEffect
  task?: Pick<
    ActiveTaskAction,
    'name' | 'timeframe' | 'actionSubtype' | 'modifiers'
  > & {
    startedTaskId?: string | null;
  };
}

export type FavorMessageData = {
  type: Favor;
  repAcronym: string;
  repIdentifier: RepIdentifier;
  fakeIdName?: string;
  keepingQuiet?: number;
  markedAsUsed?: boolean;
  burnedRep?: boolean;
};

export type SpecialTestData =
  | {
      type: Exclude<SpecialTest, SpecialTest.ResleevingStress>;
      source: string;
      originalResult?: SuccessTestResult;
    }
  | {
      type: 'custom';
      checkInfo: AptitudeCheckInfo;
      source: string;
      originalResult?: SuccessTestResult;
    }
  | {
      type: SpecialTest.ResleevingStress;
      stressType: StressType;
      source: string;
      originalResult?: SuccessTestResult;
      stress: StressTestData;
    };

export type RangedAttackMessageData = {
  weapon: RangedWeapon['data'];
  firingModeGroup: FiringModeGroup;
  primaryAttack: boolean;
  damageModifiers?: LabeledFormula[];
  calledShot?: CalledShot | null;
  appliedPayload?: boolean;
};

export type InfluenceRollData = {
  influences: Record<InfluenceRoll, { id: string; name: string }>;
  rollData: RollData;
  applied?: 'refreshed' | 'extended' | 'applied';
};

export type InfectionTestData = {
  testSkipped?: boolean;
  interference?: boolean;
};

export type SleightSustain = {
  name: string;
  uuid: string;
  temporaryFeatureId: string;
};

export type PsiTestData = {
  sleight: ItemEntity<ItemType.Sleight>;
  freePush: PsiPush | '' | undefined;
  push: PsiPush | '';
  sideEffectNegation: '' | 'damage' | 'all';
  variableInfection: boolean;
  willpower: number;
  sustaining?: boolean;
  appliedTo?: SleightSustain[];
};

export type SleightSustainEnd = {
  appliedTo: SleightSustain[];
  removedFromIds: string[];
};

export type MessageData = Partial<{
  header: MessageHeaderData;
  targets: MessageTargets;
  areaEffect: MessageAreaEffectData;
  stress: StressTestMessageData;
  damage: DamageMessageData;
  attackTraitInfo: AttackTraitData;
  healthChange: HealthChangeMessageData;
  explosiveUse: ExplosiveMessageData;
  meleeAttack: MeleeWeaponMessageData;
  thrownAttack: ThrownWeaponMessageData;
  rangedAttack: RangedAttackMessageData;
  heal: MessageHealData;
  substanceUse: SubstanceUseData;
  fromMessageId: string;
  successTest: SuccessTestMessageData;
  specialTest: SpecialTestData;
  favor: FavorMessageData;
  hack: HackMessageData;
  infectionTest: InfectionTestData;
  influenceRoll: InfluenceRollData;
  psiTest: PsiTestData;
  sleightSustainEnd: SleightSustainEnd;
}>;
