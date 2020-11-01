import type { BlueprintType, Complexity, GearQuality, GearTrait, MorphCost, PoolType } from "@src/data-enums";
import type { MovementRate } from "@src/features/movement";
import type { JsonValue } from "type-fest";

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
  resource: MorphCost | "";
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
    blueprintType: "" | BlueprintType;
    used: boolean;
    cracked: boolean;
  }>;
};

type GearState = { state: { equipped: boolean; disabled: boolean } };

type ItemTemplates = Template<"Common", CommonDetails> &
  Template<"Cost", GearCost & { quality: GearQuality }> &
  Template<"GearTraits", GearTraits> &
  Template<"Copyable", Copyable> &
  Template<"GearState", GearState>;
type ActorTemplates = Template<"Common", CommonDetails> &
  Template<"Mobile", { movementRates: StringID<MovementRate>[] }> &
  Template<"Acquisition", Acquisition> &
  Template<"PoolData", { pools: MorphPoolsData }>
  // Template<"PhysicalHealth", { physicalHealth: PhysicalHealthData }> &
  // Template<"FullMeshHealth", { meshHealth: FullMeshHealthData }> &
  // Template<"Firewall", { firewall: FirewallData }> &
  // Template<"Conditions", { conditions: ConditionType[] }>;
