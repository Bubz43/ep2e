import type {
  BeamWeaponAttackData,
  ExplosiveAttackData,
  FirearmAmmoModeData,
  KineticWeaponAttackData,
  MeleeWeaponAttackData,
  SleightAttackData,
  SoftwareAttackData,
  SprayWeaponAttackData,
  SubstanceAttackData,
  ThrownWeaponAttackData,
} from '@src/combat/attacks';
import type {
  Activation,
  AptitudeType,
  AreaEffectType,
  ArmorWare,
  AttackTrait,
  BlueprintType,
  BotType,
  CharacterDetail,
  CharacterPoint,
  Complexity,
  DeviceType,
  DrugAddiction,
  EgoSetting,
  ExplosiveSize,
  ExplosiveType,
  FabType,
  Fork,
  GearQuality,
  GearTrait,
  KineticWeaponClass,
  MinStressOption,
  MorphCost,
  PhysicalServiceType,
  PhysicalWare,
  PoolType,
  PsiPush,
  RangedWeaponAccessory,
  RangedWeaponTrait,
  RechargeType,
  ShellHostType,
  ShellType,
  SleightDuration,
  SleightSpecial,
  SleightType,
  SoftwareType,
  SprayPayload,
  SubstanceApplicationMethod,
  SubstanceClassification,
  SubstanceType,
  ThreatLevel,
  TraitSource,
  TraitType,
  VehicleType,
} from '@src/data-enums';
import type { ItemType, ActorType } from '@src/entities/entity-types';
import type { AccessPrivilege } from '@src/features/account-shell';
import type { ActionType, ActiveTaskAction } from '@src/features/actions';
import type { ConditionType } from '@src/features/conditions';
import type { Effect } from '@src/features/effects';
import type { FiringMode } from '@src/features/firing-modes';
import type {
  ActiveForkData,
  EgoBackupData,
} from '@src/features/forks-and-backups';
import type { Motivation } from '@src/features/motivations';
import type { MovementRate } from '@src/features/movement';
import type { RechargeData } from '@src/features/recharge';
import type { EgoRepData, RepBase, RepData, RepNetwork } from '@src/features/reputations';
import type { Size } from '@src/features/size';
import type {
  Aptitudes,
  FieldSkillData,
  FieldSkillType,
  SkillData,
  SkillType,
} from '@src/features/skills';
import type { BiologicalHealthData } from '@src/health/biological-health';
import type { HealthType } from '@src/health/health';
import type { InfomorphHealthData } from '@src/health/infomorph-health';
import type { MentalHealthData } from '@src/health/mental-health';
import type { RecoveryConditions } from '@src/health/recovery';
import type { SyntheticHealthData } from '@src/health/synthetic-health';
import type { JsonValue } from 'type-fest';

type StringID<T> = T & { id: string };
type TopLevel = Record<string, JsonValue>;

type Template<T extends string, D extends TopLevel> = {
  readonly [key in T]: Readonly<D>;
};

export type CommonDetails = {
  description: string;
  reference: string;
};

export type GearCost = {
  complexity: Complexity;
  restricted: boolean;
};

export type AcquisitionData = {
  resource: MorphCost | '';
  /**
   * @minimum 0
   */
  cost: number;
  /**
   * @minimum 0
   * @maximum 100
   */
  availability: number;
} & GearCost;

type Acquisition = {
  acquisition: AcquisitionData;
};

export type MorphPoolsData = Record<Exclude<PoolType, PoolType.Threat>, number>;

type GearTraits = Readonly<Record<GearTrait, boolean>>;
export type BlueprintData = {
  blueprintType: '' | BlueprintType;
  used: boolean;
  cracked: boolean;
};

type Copyable = {
  blueprint: BlueprintData;
};

type GearState = { state: { equipped: boolean; disabled: boolean } };

type ActorTypeTemplates = AT<ActorType.Character, CharacterData> &
  AT<ActorType.SyntheticShell, SyntheticShellData> &
  AT<ActorType.Biological, BiologicalData> &
  AT<ActorType.Infomorph, InfomorphData>;

type ItemTemplates = Template<'Common', CommonDetails> &
  Template<'Cost', GearCost & { quality: GearQuality }> &
  Template<'GearTraits', GearTraits> &
  Template<'Copyable', Copyable> &
  Template<'GearState', GearState>;
type ActorTemplates = Template<'Common', CommonDetails> &
  Template<'Mobile', { movementRates: StringID<MovementRate>[] }> &
  Template<'Acquisition', Acquisition> &
  Template<'PoolData', { pools: MorphPoolsData }> &
  Template<'Conditions', { conditions: ConditionType[] }>;

type UseActorTemplate<T extends (keyof ActorTemplates)[]> = T;
type UseItemTemplate<T extends (keyof ItemTemplates)[]> = T;

export type EgoData = {
  egoType: string;
  forkType: '' | Fork;
  threat: number;
  flex: number;
  aptitudes: Readonly<Aptitudes>;
  skills: Readonly<Record<SkillType, Readonly<SkillData>>>;
  fieldSkills: Record<FieldSkillType, StringID<FieldSkillData>[]>;
  points: Readonly<Record<CharacterPoint, number>>;
  reps: Record<RepNetwork, EgoRepData>;
  settings: Readonly<Record<EgoSetting, boolean>>;
  mentalHealth: Readonly<MentalHealthData>;
  motivations: StringID<Motivation>[];
  characterDetails: Readonly<Record<CharacterDetail, string>>;
  threatDetails: Readonly<{
    niche: string;
    numbers: string;
    level: ThreatLevel;
    stress: {
      sv: string;
      minStressOption: MinStressOption;
      minSV: number;
      notes: string;
    };
  }>;
  mentalEdits: StringID<{ edit: string }>[];
  activeForks: StringID<ActiveForkData>[];
  backups: StringID<EgoBackupData>[];
  additionalNotes: string;
};

export type AppliedSubstanceBase = {
  duration: number;
  effects: Effect[];
  name: string;
  type: SubstanceType;
  classification: SubstanceClassification | SubstanceType.Chemical;
  wearOffStress: string;
  conditions: ConditionType[];
};

type CharacterData = EgoData & {
  templates: ['Common'];
  fakeId: string;
  homeDevice: { itemId: string; actorId: string };
  network: {
    masterDeviceId: string;
    unslavedDevices: string[];
    systemDefenders: string[];
  };
  // temporary: StringID<TemporaryFeature>[];
  spentPools: Readonly<Record<PoolType, number>>;
  // accountShells: StringID<AccountShell>[];
  // TODO toggle psi
  purchaseLog: StringID<{
    name: string;
    date: string;
    costType: CharacterPoint;
    costValue: number;
    itemId: string;
  }>[];
  favoriteItems: string[];
  tasks: StringID<ActiveTaskAction>[];
  accumulatedTime: number;
  // log: StringID<CharacterLogEntry>[];
  appliedSubstances: StringID<
    AppliedSubstanceBase & {
      elapsed: number;
      itemIds: string[];
      damage: SubstanceAttackData & { ticks: number };
    }
  >[];
  combatState: {
    complexAim: boolean;
    physicalFullDefense: boolean;
    mentalFullDefense: boolean;
    trackStandardAmmo: boolean;
  };
} & Readonly<Record<RechargeType, RechargeData>>;

type InfomorphData = {
  templates: UseActorTemplate<
    [
      'Common',
      'Acquisition',
      'PoolData',
      // "Firewall",
      'Conditions',
    ]
  >;
  // subtype: string;
  // localFirewall: boolean;
  meshHealth: InfomorphHealthData;
  // additionalHomeDevices: StringID<DistributedMeshHealthData>[];
  // privilege: AccessPrivilege;
};

type SyntheticShellData = {
  templates: UseActorTemplate<
    ['Common', 'Mobile', 'Acquisition', 'PoolData', 'Conditions']
  >;
  shellType: ShellType;
  subtype: '' | VehicleType | BotType;
  passengers: number;
  unarmedDV: string;
  isSwarm: boolean;
  painFilter: boolean;
  recoveryConditions: RecoveryConditions;
  physicalHealth: SyntheticHealthData;
  meshHealth: InfomorphHealthData;
  brain: string;
  size: Size;
  /**
   * @minimum 0
   */
  prehensileLimbs: number;
  inherentArmor: { energy: number; kinetic: number; source: string };
  reach: number;
};

// TODO: Limbs/Prehensile Limbs

type BiologicalData = {
  templates: UseActorTemplate<
    [
      'Common',
      'Mobile',
      'Acquisition',
      'PoolData',
      // "FullMeshHealth",
      // "Firewall",
      'Conditions',
    ]
  >;
  subtype: string;
  sex: string;
  unarmedDV: string;
  reach: number;
  isSwarm: boolean;
  brain: string;
  /**
   * @minimum 0
   */
  prehensileLimbs: number;
  size: Size;
  recoveryConditions: RecoveryConditions;
  physicalHealth: BiologicalHealthData;
};

type IT<
  /* Only 1 */
  T extends ItemType,
  D extends TopLevel & { templates: (keyof ItemTemplates)[] }
> = {
  [key in T]: {
    templates: D['templates'];
  } & Readonly<Omit<D, 'templates'>>;
};

type AT<
  /* Only 1 */
  T extends ActorType,
  D extends TopLevel & { templates: (keyof ActorTemplates)[] }
> = {
  [key in T]: {
    templates: D['templates'];
  } & Readonly<Omit<D, 'templates'>>;
};

type ItemTypeTemplates = IT<ItemType.Trait, TraitData> &
  IT<ItemType.Psi, PsiData> &
  IT<ItemType.Sleight, SleightData> &
  IT<ItemType.Substance, SubstanceData> &
  IT<ItemType.Armor, ArmorData> &
  IT<ItemType.Explosive, ExplosiveData> &
  IT<ItemType.MeleeWeapon, MeleeWeaponData> &
  IT<ItemType.BeamWeapon, BeamWeaponData> &
  IT<ItemType.Railgun, RailgunData> &
  IT<ItemType.Firearm, FirearmData> &
  IT<ItemType.FirearmAmmo, FirearmAmmoData> &
  IT<ItemType.SprayWeapon, SprayWeaponData> &
  IT<ItemType.SeekerWeapon, SeekerWeaponData> &
  IT<ItemType.ThrownWeapon, ThrownWeaponData> &
  IT<ItemType.PhysicalTech, PhysicalTechData> &
  IT<ItemType.Software, SoftwareData> &
  IT<ItemType.PhysicalService, PhysicalServiceData>;

type TraitData = {
  templates: UseItemTemplate<['Common']>;
  traitType: TraitType;
  subtype: string;
  source: TraitSource;
  restrictions: string;
  triggers: string;
  /**
   * @minItems 1
   */
  levels: StringID<{
    cost: number;
    effects: StringID<Effect>[];
  }>[];
  state: {
    triggered: boolean;
    level: number;
  };
};

type SleightData = {
  templates: UseItemTemplate<['Common']>;
  sleightType: SleightType;
  duration: SleightDuration;
  /**
   * @minimum 0
   * @maximum 80
   */
  infectionMod: number;
  action: ActionType;
  effectsOnTarget: StringID<Effect>[];
  effectsOnSelf: StringID<Effect>[];
  effects: StringID<Effect>[];
  scaleEffectsOnSuperior: boolean;
  special: '' | SleightSpecial;
  mentalArmor: {
    formula: string;
    divisor: number;
  };
  attack: SleightAttackData;
  heal: {
    amount: string;
    health: HealthType;
  };
  state: {
    sustained: boolean;
  };
};

type SubstanceData = {
  templates: UseItemTemplate<['Common', 'Cost', 'Copyable']>;
  category: string;
  quantity: number;
  quantityPerCost: number;
  consumeOnUse: boolean;
  substanceType: SubstanceType;
  classification: SubstanceClassification;
  /**
   * @minItems 1
   * @maxItems 4
   * @uniqueItems true
   */
  application: SubstanceApplicationMethod[];
  addiction: '' | DrugAddiction;
  addictionMod: number;
  isAntidote: boolean;
  hasSeverity: boolean;
  alwaysApplied: {
    effects: StringID<Effect>[];
    duration: number;
    damage: SubstanceAttackData;
    wearOffStress: string;
    notes: string;
  };
  severity: {
    duration: number;
    effects: StringID<Effect>[];
    check: AptitudeType;
    checkMod: number;
    conditions: ConditionType[];
    damage: SubstanceAttackData;
    wearOffStress: string;
    notes: string;
  };
  state: { stashed: boolean };
};

type PsiData = {
  templates: UseItemTemplate<['Common']>;
  level: 1 | 2 | 3;
  requireBioSubstrate: boolean;
  state: {
    freePush: PsiPush | '';
    /**
     * @minimum 10
     * @maximum 99
     */
    infectionRating: number;
    receded: boolean;
    checkoutTime: boolean;
    interference: boolean;
  };
};

export type ArmorValues = {
  energy: number;
  kinetic: number;
  concealable: boolean;
  layerable: boolean;
};

type ArmorData = {
  templates: UseItemTemplate<['Common', 'Cost', 'Copyable', 'GearState']>;
  effects: StringID<Effect>[];
  wareType: PhysicalWare | '';
  notes: string;
  attackTraits: AttackTrait[];
  hasActiveState: boolean;
  armorValues: ArmorValues;
  activeArmor: ArmorValues;
  state: { activated: boolean };
} & Omit<GearTraits, 'concealable'>;

type ExplosiveData = {
  templates: UseItemTemplate<['Common', 'Cost', 'Copyable']>;
  explosiveType: ExplosiveType;
  size: ExplosiveSize;
  quantity: number;
  unitsPerComplexity: number;
  sticky: boolean;
  areaEffect: '' | AreaEffectType;
  areaEffectRadius: number;
  containSubstance: boolean;
  dosesPerUnit: number;
  // TODO drug/toxin doses?
  hasSecondaryMode: boolean;
  primaryAttack: ExplosiveAttackData;
  secondaryAttack: ExplosiveAttackData;
  state: { stashed: boolean };
};

type MeleeWeaponData = {
  templates: UseItemTemplate<
    ['Common', 'Cost', 'GearTraits', 'Copyable', 'GearState']
  >;
  wareType: '' | PhysicalWare;
  primaryAttack: MeleeWeaponAttackData;
  secondaryAttack: MeleeWeaponAttackData;
  touchOnly: boolean;
  reachBonus: number;
  augmentUnarmed: boolean;
  improvised: boolean;
  exoticSkill: string;
  hasSecondaryAttack: boolean;
  acceptsPayload: boolean;
};

type ThrownWeaponData = {
  templates: UseItemTemplate<['Common', 'Cost', 'GearTraits', 'Copyable']>;
  quantity: number;
  primaryAttack: ThrownWeaponAttackData;
  exoticSkill: string;
};

type RangedWeaponDataBase = {
  templates: UseItemTemplate<
    ['Common', 'Cost', 'GearTraits', 'Copyable', 'GearState']
  >;
  wareType: '' | PhysicalWare;
  range: number;
  /**
   * @uniqueItems
   */
  accessories: RangedWeaponAccessory[];
  state: { braced: boolean; interface: boolean };
  firedShots: number;
};

type SeekerAmmo = {
  missileSize: ExplosiveSize;
  range: number;
  missileCapacity: number;
};

type SeekerWeaponData = Omit<RangedWeaponDataBase, 'range'> &
  Record<RangedWeaponTrait, boolean> & {
    primaryAmmo: SeekerAmmo;
    alternativeAmmo: SeekerAmmo;
    firingMode: FiringMode.SemiAutomatic | FiringMode.SingleShot;
    hasAlternativeAmmo: boolean;
    state: { homing: boolean };
  };

type SprayWeaponData = RangedWeaponDataBase & {
  payloadUse: '' | SprayPayload;
  dosesPerShot: number;
  fixed: boolean;
  long: boolean;
  ammo: {
    value: number;
    max: number;
  };
  primaryAttack: SprayWeaponAttackData;
};

type FirearmData = RangedWeaponDataBase & {
  ammo: {
    value: number;
    /**
     * @minimum 1
     */
    max: number;
    ammoClass: KineticWeaponClass;
    selectedForm: number;
    forms: number[];
  };
  fixed: boolean;
  long: boolean;
  primaryAttack: KineticWeaponAttackData;
};

type FirearmAmmoData = {
  templates: UseItemTemplate<['Common', 'Cost', 'Copyable']>;
  ammoClass: KineticWeaponClass;
  quantity: number;
  carryPayload: boolean;
  /**
   * @minItems 1
   */
  forms: StringID<FirearmAmmoModeData>[];
  state: { stashed: boolean };
};

type RailgunData = RangedWeaponDataBase & {
  ammo: {
    value: number;
    max: number;
    ammoClass: KineticWeaponClass;
  };
  battery: {
    charge: number;
    max: number;
    recharge: number;
  };
  fixed: boolean;
  long: boolean;
  primaryAttack: KineticWeaponAttackData;
};

type BeamWeaponData = RangedWeaponDataBase &
  Record<RangedWeaponTrait, boolean> & {
    ammo: {
      max: number;
      charge: number;
      recharge: number;
    };
    primaryAttack: BeamWeaponAttackData;
    secondaryAttack: BeamWeaponAttackData;
    hasSecondaryAttack: boolean;
  };

type SoftwareData = {
  templates: UseItemTemplate<['Common', 'Cost']>;
  softwareType: SoftwareType;
  effects: StringID<Effect>[];
  activatedEffects: StringID<Effect>[];
  primaryAttack: SoftwareAttackData;
  secondaryAttack: SoftwareAttackData;
  category: string;
  serviceDuration: number;
  // meshHealth: AppMeshHealthData;
  skills: StringID<
    | (FieldSkillData & { fieldSkill: FieldSkillType })
    | (SkillData & { skillType: SkillType })
  >[];
  settings: {
    hasActiveState: boolean;
    hasAttack: boolean;
    trackMeshHealth: boolean;
  };
  state: {
    equipped: boolean;
    activated: boolean;
    serviceElapsed: number;
    paused: boolean;
  };
};

type PhysicalTechData = {
  templates: UseItemTemplate<
    ['Common', 'Cost', 'GearTraits', 'Copyable', 'GearState']
  >;
  meshHealth: InfomorphHealthData;
  effects: StringID<Effect>[];
  activatedEffects: StringID<Effect>[];
  wareType: '' | PhysicalWare;
  activation: Activation;

  state: {
    activated: boolean;
    embeddedEgos: string[];
    onboardAliDeleted: boolean;
  };
  use: {
    duration: number;
    check: AptitudeType | '';
  };
  deviceType: '' | DeviceType;
  category: string;
  fabricator: '' | FabType;
};

type PhysicalServiceData = {
  templates: UseItemTemplate<['Common', 'Cost']>;
  serviceType: PhysicalServiceType;
  reputations: StringID<RepBase>[];
  duration: number;
  state: { elapsed: number };
};

export interface EntityTemplates {
  Actor: {
    /**
     * @minItems 4
     * @maxItems 4
     * @uniqueItems true
     */
    types: ActorType[];
    templates: ActorTemplates;
  } & ActorTypeTemplates;

  Item: {
    /**
     * @minItems 17
     * @maxItems 17
     * @uniqueItems true
     */
    types: (keyof ItemTypeTemplates)[];
    templates: ItemTemplates;
  } & ItemTypeTemplates;
}
