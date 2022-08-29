import {
  createDefaultPsiInfluences,
  PsiInfluenceType,
} from '@src/features/psi-influence';
import {
  deepMerge,
  toTuple,
  updateManyActors,
} from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import produce from 'immer';
import { concat, difference, isArray, map, pipe } from 'remeda';
import type { ActorEP } from './actor/actor';
import { ActorType, ItemType, sleeveTypes } from './entity-types';
import {
  ActorEntity,
  createActorEntity,
  createItemEntity,
  ItemDatas,
  ItemEntity,
} from './models';
import type { UpdateStore } from './update-store';

// ! Make sure not to access proxies in migrations, instead use main entity

export const migrateWorld = async () => {
  await pipe(
    [...game.actors.values()],
    map(migrateActor),
    concat(
      [...game.scenes.values()].flatMap((scene) => {
        const { tokens } = scene.toJSON();
        return [...tokens.values()].flatMap((tokenDoc) => {
          return tokenDoc.actor?.isToken ? migrateActor(tokenDoc.actor) : [];
        });
      }),
    ),
    updateManyActors,
  );
  // await pipe(
  //   [...game.items.values()],
  //   map(({ data }) => {
  //     switch (data.type) {
  //       case ItemType.MeleeWeapon:
  //         return migrateMeleeFlags(data);

  //       case ItemType.Substance:
  //         return migrateSubstanceFlags(data);

  //       case ItemType.Explosive:
  //         return migrateExplosiveFlags(data);

  //       case ItemType.Psi:
  //         return migratePsiFlags(data)

  //       default:
  //         return null;
  //     }
  //   }),
  //   compact,
  //   (datas) => Item.update(datas as ItemDatas[]),
  // );
};

const migrateActor = (actor: ActorEP) => {
  const data = actor.toJSON();
  if (data.type === ActorType.Character) {
    const updater = actor.updater as UpdateStore<
      ActorEntity<ActorType.Character>
    >;
    const epFlags = data.flags[EP.Name] || {};
    for (const sleeveType of sleeveTypes) {
      const sleeveData = epFlags[sleeveType];
      if (sleeveData?.type) {
        const updatedData = createActorEntity({
          name: sleeveData.name,
          type: sleeveData.type,
        });
        updater
          .path('flags', EP.Name, sleeveData.type)
          .store(mergeObject(updatedData, sleeveData, { inplace: false }));
      } else updater.path('flags', EP.Name, sleeveType).store(null);
    }
    if (epFlags.vehicle) {
      const { vehicle } = epFlags;
      const updatedData = createActorEntity({
        name: vehicle.name,
        type: vehicle.type,
      });
      updater
        .path('flags', EP.Name, 'vehicle')
        .store(mergeObject(updatedData, vehicle, { inplace: false }));
    }
    if (epFlags.psi) {
      pipe(
        epFlags.psi,
        baseItemMigration,
        migratePsiFlags,
        updater.path('flags', EP.Name, epFlags.psi.type).store,
      );
    }
  }
  return actor;
};

const baseItemMigration = <T extends ItemType>(data: ItemEntity<T>) => {
  return deepMerge(
    createItemEntity({ name: data.name, type: data.type }) as ItemDatas,
    data as ItemDatas,
  ) as ItemEntity<T>;
};

const substanceGroups = ['baseAppliedItems', 'severityAppliedItems'] as const;
const migrateSubstanceFlags = (data: ItemEntity<ItemType.Substance>) => {
  return produce(data, ({ flags }) => {
    if (!flags.ep2e) return;
    for (const group of substanceGroups) {
      const list = flags.ep2e[group];
      if (list) {
        flags.ep2e[group] = list.map((i) =>
          i.type === ItemType.Trait
            ? baseItemMigration(i)
            : baseItemMigration(i),
        );
      }
    }
  });
};

const migratePsiFlags = (data: ItemEntity<ItemType.Psi>) => {
  return produce(data, ({ flags }) => {
    const influences = flags.ep2e?.influences;
    flags.ep2e = {
      ...(flags.ep2e ?? {}),
      influences: influences
        ? influences.map((i) =>
            i.type === PsiInfluenceType.Trait
              ? {
                  ...i,
                  trait: baseItemMigration(i.trait),
                }
              : i,
          )
        : createDefaultPsiInfluences(),
    };
  });
};

const migrateExplosiveFlags = (data: ItemEntity<ItemType.Explosive>) => {
  return produce(data, ({ flags }) => {
    if (!flags.ep2e?.substance) return;
    flags.ep2e.substance = pipe(
      flags.ep2e.substance[0],
      baseItemMigration,
      migrateSubstanceFlags,
      toTuple,
    );
  });
};
