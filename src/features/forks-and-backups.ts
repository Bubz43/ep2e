import { Fork } from '@src/data-enums';
import { createFeature } from './feature-helpers';

export type ActiveForkData = {
  forkType: Fork;
  // Date
  whenMade: string;
  notes: string;
  packId: string;
  forkId: string;
};

export type EgoBackupData = {
  // Date
  whenMade: string;
  storageLocation: string;
  packId: string;
  backupId: string;
};

export const createActiveForkData = createFeature<ActiveForkData>(() => ({
  whenMade: new Date().toISOString(),
  forkType: Fork.Alpha,
  notes: '',
  packId: '',
  forkId: '',
}));
