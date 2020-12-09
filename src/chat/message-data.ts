import type { ArmorType } from '@src/features/active-armor';
import type { RolledFormula } from '@src/foundry/rolls';
import type { HealthModification, HealthStat, HealthType } from '@src/health/health';
import type { StressType } from '@src/health/mental-health';

export type StressTestMessageData = {
  rolledFormulas: RolledFormula[];
  minStress: '' | 'half' | number;
  stressType: StressType;
  notes: string;
  source?: string;
};

export type HealthChangeMessageData = HealthModification & {
  healthType: HealthType;
  passedThreshold: "" | HealthStat.Durability | HealthStat.DeathRating
  reducedArmor?: Partial<Record<ArmorType, number>>
}

export type MessageHeaderData = {
  heading: string;
  subheadings?: string | string[];
  img?: string;
  description?: string;
};

export type MessageData = Partial<{
  header: MessageHeaderData;
  stress: StressTestMessageData;
  healthChange: HealthChangeMessageData;
}>;
