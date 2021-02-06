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
import { concat, map, pipe } from 'remeda';
import type { ActorEP } from './actor/actor';
import { ActorType, ItemType, sleeveTypes } from './entity-types';
import {
  createActorEntity,
  createItemEntity,
  ItemDatas,
  ItemEntity,
} from './models';

// ! Make sure not to access proxies in migrations, instead use main entity

export const migrateWorld = async () => {
  await pipe(
    [...game.actors.values()],
    map(migrateActor),
    concat(
      [...game.scenes.values()].flatMap((scene) => {
        const { tokens } = scene.data;
        return tokens.flatMap((tokenData) => {
          const token = new Token(tokenData);
          return token.actor?.isToken ? migrateActor(token.actor) : [];
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
  if (actor.data.type === ActorType.Character) {
    const epFlags = actor.data.flags[EP.Name] || {};
    for (const sleeveType of sleeveTypes) {
      const sleeveData = epFlags[sleeveType];
      if (sleeveData?.type) {
        const updatedData = createActorEntity({
          name: sleeveData.name,
          type: sleeveData.type,
        });
        actor.updater
          .path('flags', EP.Name, sleeveData.type)
          .store(mergeObject(updatedData, sleeveData, { inplace: false }));
      } else actor.updater.path('flags', EP.Name, sleeveType).store(null);
    }
    if (epFlags.psi) {
      pipe(
        epFlags.psi,
        baseItemMigration,
        migratePsiFlags,
        actor.updater.path('flags', EP.Name, epFlags.psi.type).store,
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

const migrateMeleeFlags = (data: ItemEntity<ItemType.MeleeWeapon>) => {
  const { coating, payload } = data.flags[EP.Name] || {};
  if (coating || payload) {
    return produce(data, ({ flags }) => {
      if (!flags.ep2e) return;
      flags.ep2e.coating =
        coating &&
        pipe(coating[0], baseItemMigration, migrateSubstanceFlags, toTuple);

      flags.ep2e.payload =
        payload &&
        pipe(payload[0], baseItemMigration, migrateExplosiveFlags, toTuple);
    });
  }
  return null;
};
