import type { RolledFormula } from "@src/foundry/rolls"
import type { StressType } from "@src/health/mental-health"

export type StressTestMessageData = {
  rolledFormulas: RolledFormula[];
  minStress: "" | "half" | number;
  stressType: StressType
  notes: string;
}

export type MessageData = Partial<{
  stress: StressTestMessageData;
}>