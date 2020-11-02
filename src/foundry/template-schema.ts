import type {
  ArmorWare,
  AttackTrait,
  BlueprintType,
  Complexity,
  GearQuality,
  GearTrait,
  MorphCost,
  PoolType,
  PsiPush,
  TraitSource,
  TraitType,
} from '@src/data-enums';
import type { ItemType, ActorType } from '@src/entities/entity-types';
import type { ConditionType } from '@src/features/conditions';
import type { Effect } from '@src/features/effects';
import type { MovementRate } from '@src/features/movement';
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

// Template<"PhysicalHealth", { physicalHealth: PhysicalHealthData }> &
// Template<"FullMeshHealth", { meshHealth: FullMeshHealthData }> &
// Template<"Firewall", { firewall: FirewallData }> &
