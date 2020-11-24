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
import type { ActorType, ItemType } from '@src/entities/entity-types';
import type { ActionType, ActiveTaskAction } from '@src/features/actions';
import type { ConditionType } from '@src/features/conditions';
import type { Effect } from '@src/features/effects';
import type { FiringMode } from '@src/features/firing-modes';
import type { Motivation } from '@src/features/motivations';
import type { MovementRate } from '@src/features/movement';
import type { RechargeData } from '@src/features/recharge';
import type {
  EgoRepData,
  RepBase,
  RepNetwork,
} from '@src/features/reputations';
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
import type { MeshHealthData } from '@src/health/full-mesh-health';
import type { MentalHealthData } from '@src/health/mental-health';
import type { RecoveryConditions } from '@src/health/recovery';
import type { SyntheticHealthData } from '@src/health/synthetic-health';
import type { JsonValue } from 'type-fest';
import type { AppMeshHealthData } from '@src/health/app-mesh-health';
import type { TemporaryFeature } from '@src/features/temporary';

type StringID<T> = T & { id: string };
type TopLevel = Record<string, JsonValue>;

type Template<T extends string, D extends TopLevel> = {
  readonly [key in T]: D;
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

type GearTraits = Record<GearTrait, boolean>;
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
  Template<'GearState', GearState> &
  Template<'Stackable', { quantity: number; state: { stashed: boolean } }>;
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
  aptitudes: Aptitudes;
  skills: Record<SkillType, SkillData>;
  fieldSkills: Record<FieldSkillType, StringID<FieldSkillData>[]>;
  points: Record<CharacterPoint, number>;
  reps: Record<RepNetwork, EgoRepData>;
  settings: Record<EgoSetting, boolean>;
  mentalHealth: MentalHealthData;
  motivations: StringID<Motivation>[];
  characterDetails: Record<CharacterDetail, string>;
  threatDetails: {
    niche: string;
    numbers: string;
    level: ThreatLevel;
    stress: {
      sv: string;
      minStressOption: MinStressOption;
      minSV: number;
      notes: string;
    };
  };
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
  temporary: StringID<TemporaryFeature>[];
  spentPools: Record<PoolType, number>;
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
  accumulatedTimeStart: number;
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
} & Record<RechargeType, RechargeData>;

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
  meshHealth: MeshHealthData;
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
  firewallRating: number;
  firewallHealth: AppMeshHealthData;
  meshHealth: MeshHealthData;
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
  } & Omit<D, 'templates'>;
};

type AT<
  /* Only 1 */
  T extends ActorType,
  D extends TopLevel & { templates: (keyof ActorTemplates)[] }
> = {
  [key in T]: {
    templates: D['templates'];
  } & Omit<D, 'templates'>;
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
  templates: UseItemTemplate<['Common', 'Cost', 'Copyable', 'Stackable']>;
  category: string;
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
};

type PsiData = {
  templates: UseItemTemplate<['Common']>;
  level: 1 | 2 | 3;
  requireBioSubstrate: boolean;
  strain: string;
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
  templates: UseItemTemplate<['Common', 'Cost', 'Copyable', 'Stackable']>;
  explosiveType: ExplosiveType;
  size: ExplosiveSize;
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
  templates: UseItemTemplate<
    ['Common', 'Cost', 'GearTraits', 'Copyable', 'Stackable']
  >;
  quantityPerCost: number;
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

type Polygun = {
  shapeChanging: boolean;
  shapeName: string;
};

type FirearmData = RangedWeaponDataBase &
  Polygun & {
    ammo: {
      value: number;
      /**
       * @minimum 1
       */
      max: number;
      ammoClass: KineticWeaponClass;
      selectedModeIndex: number;
      modeSettings: number[];
    };
    fixed: boolean;
    long: boolean;
    primaryAttack: KineticWeaponAttackData;
  };

type FirearmAmmoData = {
  templates: UseItemTemplate<['Common', 'Cost', 'Copyable', 'Stackable']>;
  ammoClass: KineticWeaponClass;
  roundsPerComplexity: number;
  carryPayload: boolean;
  quantity: number;
  /**
   * @minItems 1
   */
  modes: StringID<FirearmAmmoModeData>[];
};

type RailgunData = RangedWeaponDataBase &
  Polygun & {
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
    battery: {
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
  meshHealth: AppMeshHealthData;
  skills: StringID<{ name: string; specialization: string; total: number }>[];
  activation: '' | Exclude<ActionType, ActionType.Task>;
  meshAttacks: 0 | 1 | 2;
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
  meshHealth: MeshHealthData;
  firewallRating: number;
  firewallHealth: AppMeshHealthData;
  passiveEffects: StringID<Effect>[];
  activatedEffects: StringID<Effect>[];
  wareType: '' | PhysicalWare;
  activation: Activation;
  activationAction: Exclude<ActionType, ActionType.Task>;
  usedEffectsDuration: number;
  resistEffectsCheck: AptitudeType | '';
  onboardALI: boolean;
  state: {
    activated: boolean;
    embeddedEgos: string[];
    onboardAliDeleted: boolean;
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
  state: { elapsed: number; equipped: boolean };
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
