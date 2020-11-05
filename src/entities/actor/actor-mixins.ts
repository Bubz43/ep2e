import type { AcquisitionData } from "@src/foundry/template-schema";
import type { Class } from "type-fest";

type HasEpData<T> = Class<{ epData: T }>;

export const Acquirable = (cls: HasEpData<{ acquisition: AcquisitionData }>) => {
  
}