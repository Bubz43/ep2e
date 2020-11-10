import { Fork } from '@src/data-enums';
import { createFeature } from './feature-helpers';
import { createTimestamp, Timestamp } from './time';

export type ActiveForkData = Timestamp & {
  forkType: Fork;
  notes: string;
  packId: string;
  forkId: string;
};

export type EgoBackupData = Timestamp & {
  storageLocation: string;
  packId: string;
  backupId: string;
};

export type MentalEdit = Timestamp & { edit: string }

export const createActiveForkData = createFeature<ActiveForkData>(() => ({
  forkType: Fork.Alpha,
  notes: '',
  packId: '',
  forkId: '',
  ...createTimestamp({})
}));

