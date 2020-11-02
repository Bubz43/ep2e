import type { ExplosiveAttackData, SleightAttackData, SubstanceAttackData } from '@src/combat/attacks';
import type {
  AptitudeType,
  AreaEffectType,
  ArmorWare,
  AttackTrait,
  BlueprintType,
  Complexity,
  DrugAddiction,
  ExplosiveSize,
  ExplosiveType,
  GearQuality,
  GearTrait,
  MorphCost,
  PoolType,
  PsiPush,
  SleightDuration,
  SleightSpecial,
  SleightType,
  SubstanceApplicationMethod,
  SubstanceClassification,
  SubstanceType,
  TraitSource,
  TraitType,
} from '@src/data-enums';
import type { ItemType, ActorType } from '@src/entities/entity-types';
import type { ActionType } from '@src/features/actions';
import type { ConditionType } from '@src/features/conditions';
import type { Effect } from '@src/features/effects';
import type { MovementRate } from '@src/features/movement';
import type { HealthType } from '@src/health/health';
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

type Copyable = {
  blueprint: Readonly<{
    blueprintType: '' | BlueprintType;
    used: boolean;
    cracked: boolean;
  }>;
};

type GearState = { state: { equipped: boolean; disabled: boolean } };

type ItemTemplates = Template<'Common', CommonDetails> &
  Template<'Cost', GearCost & { quality: GearQuality }> &
  Template<'GearTraits', GearTraits> &
  Template<'Copyable', Copyable> &
  Template<'GearState', GearState>;
type ActorTemplates = Template<'Common', CommonDetails> &
  Template<'Mobile', { movementRates: StringID<MovementRate>[] }> &
  Template<'Acquisition', Acquisition> &
  Template<'PoolData', { pools: MorphPoolsData }> &
  Template<"Conditions", { conditions: ConditionType[] }>;

  type UseActorTemplate<T extends (keyof ActorTemplates)[]> = T;
type UseItemTemplate<T extends (keyof ItemTemplates)[]> = T;
  
type IT<
  /* Only 1 */
  T extends ItemType,
  D extends TopLevel & { templates: (keyof ItemTemplates)[] }
> = {
  [key in T]: {
    templates: D["templates"];
  } & Readonly<Omit<D, "templates">>;
};

type AT<
  /* Only 1 */
  T extends ActorType,
  D extends TopLevel & { templates: (keyof ActorTemplates)[] }
> = {
  [key in T]: {
    templates: D["templates"];
  } & Readonly<Omit<D, "templates">>;
  };

  type ItemTypeTemplates = IT<ItemType.Trait, TraitData> &
  IT<ItemType.Psi, PsiData> &
  IT<ItemType.Sleight, SleightData> &
  IT<ItemType.Substance, SubstanceData> &
  IT<ItemType.Armor, ArmorData> &
  IT<ItemType.Explosive, ExplosiveData> 
  // IT<ItemType.Software, SoftwareData> &
  // IT<ItemType.PhysicalService, PhysicalServiceData> &
  // IT<ItemType.MeleeWeapon, MeleeWeaponData> &
  // IT<ItemType.PhysicalTech, PhysicalTechData> &
  // IT<ItemType.BeamWeapon, BeamWeaponData> &
  // IT<ItemType.Railgun, RailgunData> &
  // IT<ItemType.Firearm, FirearmData> &
  // IT<ItemType.FirearmAmmo, FirearmAmmoData> &
  // IT<ItemType.SprayWeapon, SprayWeaponData> &
  // IT<ItemType.SeekerWeapon, SeekerWeaponData> &
  // IT<ItemType.ThrownWeapon, ThrownWeaponData>;

  type TraitData = {
    templates: UseItemTemplate<["Common"]>;
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
    templates: UseItemTemplate<["Common"]>;
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
    special: "" | SleightSpecial;
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
    templates: UseItemTemplate<["Common", "Cost", "Copyable"]>;
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
    addiction: "" | DrugAddiction;
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
    templates: UseItemTemplate<["Common"]>;
    level: 1 | 2 | 3;
    requireBioSubstrate: boolean;
    state: {
      freePush: PsiPush | "";
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
    templates: UseItemTemplate<
      ["Common", "Cost", "Copyable", "GearState"]
    >;
    effects: StringID<Effect>[];
    wareType: "" | ArmorWare;
    notes: string;
    attackTraits: AttackTrait[];
    hasActiveState: boolean;
    armorValues: ArmorValues;
    activeArmor: ArmorValues;
    state: { activated: boolean };
  } & Omit<GearTraits, "concealable">;

  type ExplosiveData = {
    templates: UseItemTemplate<["Common", "Cost", "Copyable"]>;
    explosiveType: ExplosiveType;
    size: ExplosiveSize;
    quantity: number;
    unitsPerComplexity: number;
    sticky: boolean;
    areaEffect: "" | AreaEffectType;
    areaEffectRadius: number;
    containSubstance: boolean;
    dosesPerUnit: number;
    // TODO drug/toxin doses?
    hasSecondaryMode: boolean;
    primaryAttack: ExplosiveAttackData;
    secondaryAttack: ExplosiveAttackData;
    state: { stashed: boolean };
  };

// Template<"PhysicalHealth", { physicalHealth: PhysicalHealthData }> &
// Template<"FullMeshHealth", { meshHealth: FullMeshHealthData }> &
// Template<"Firewall", { firewall: FirewallData }> &
