import type { RolledFormula } from '@src/foundry/rolls';
import type { StressType } from '@src/health/mental-health';

export type StressTestMessageData = {
  rolledFormulas: RolledFormula[];
  minStress: '' | 'half' | number;
  stressType: StressType;
  notes: string;
};

export type MessageHeaderData = {
  heading: string;
  subheadings?: string | string[];
  img?: string;
  description?: string;
};

export type MessageData = Partial<{
  header: MessageHeaderData;
  stress: StressTestMessageData;
}>;
