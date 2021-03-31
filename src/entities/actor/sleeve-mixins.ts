import { enumValues } from '@src/data-enums';
import type { UpdateActions } from '@src/entities/update-store';
import { ArmorType } from '@src/features/active-armor';
import type { ConditionType } from '@src/features/conditions';
import {
  addFeature,
  removeFeature,
  StringID,
} from '@src/features/feature-helpers';
import { getMovementSkill, MovementRate } from '@src/features/movement';
import type { Size } from '@src/features/size';
import type {
  AcquisitionData,
  MorphPoolsData,
} from '@src/foundry/template-schema';
import type { ArmorDamage } from '@src/health/health-changes';
import type { RecoveryConditions } from '@src/health/recovery';
import { mapToObj } from 'remeda';
import type { Class } from 'type-fest';

type HasEpData<T, E = {}> = Class<{ epData: T } & E>;

export const SleeveInfo = (
  cls: HasEpData<
    {
      acquisition: AcquisitionData;
      conditions: ConditionType[];
      pools: MorphPoolsData;
    },
    { damagedArmorUpdater: UpdateActions<StringID<ArmorDamage>[]> }
  >,
) => {
  return class extends cls {
    get acquisition() {
      return this.epData.acquisition;
    }

    get conditions() {
      return this.epData.conditions;
    }

    get pools() {
      return this.epData.pools;
    }

    addArmorDamage(
      reduction: Map<ArmorType, number> | Record<ArmorType, number>,
      source: string,
    ) {
      return this.damagedArmorUpdater.commit(
        addFeature({
          source,
          ...(reduction instanceof Map
            ? mapToObj(enumValues(ArmorType), (armor) => [
                armor,
                reduction.get(armor) || 0,
              ])
            : reduction),
        }),
      );
    }

    removeArmorDamage(id: string) {
      return this.damagedArmorUpdater.commit(removeFeature(id));
    }
  };
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
      return this.epData.movementRates.map((move) => ({
        ...move,
        skill: getMovementSkill(move.type),
      }));
    }
  };
};
