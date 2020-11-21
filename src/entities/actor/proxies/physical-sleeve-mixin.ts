import type { ConditionType } from '@src/features/conditions';
import type { StringID } from '@src/features/feature-helpers';
import type { MovementRate } from '@src/features/movement';
import type { Size } from '@src/features/size';
import type {
  AcquisitionData,
  MorphPoolsData,
} from '@src/foundry/template-schema';
import type { RecoveryConditions } from '@src/health/recovery';
import type { Class } from 'type-fest';

type HasEpData<T, E = {}> = Class<{ epData: T } & E>;

export const SleeveInfo = (
  cls: HasEpData<{
    acquisition: AcquisitionData;
    conditions: ConditionType[];
    pools: MorphPoolsData;
  }>,
) => {
  return class extends cls {
    get acquisition() {
      return this.epData.acquisition
    }

    get conditions() {
      return this.epData.conditions
    }

    get pools() {
      return this.epData.pools
    }
  }
};

export const PhysicalSleeve = (
  cls: HasEpData<{
    size: Size;
    unarmedDV: string;
    isSwarm: boolean;
    reach: number;
    prehensileLimbs: number;
    recoveryConditions: RecoveryConditions;
    movementRates: StringID<MovementRate>[];
  }>,
) => {
  return class extends cls {
    get size() {
      return this.epData.size;
    }

    get unarmedDV() {
      return this.epData.unarmedDV;
    }

    get isSwarm() {
      return this.epData.isSwarm;
    }

    get reach() {
      return this.isSwarm ? 0 : this.epData.reach;
    }

    get prehensileLimbs() {
      return this.epData.prehensileLimbs;
    }

    get recoveryConditions() {
      return this.epData.recoveryConditions;
    }

    get movementRates() {
      return this.epData.movementRates;
    }
  };
};
