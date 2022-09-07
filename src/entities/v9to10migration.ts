import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { gameSettings } from '@src/init';
import {
  createPipe,
  equals,
  intersection,
  isObject,
  keys,
  toPairs,
} from 'remeda';
import { ActorEP } from './actor/actor';
import { ChatMessageEP } from './chat-message';
import { ItemEP } from './item/item';
import { SceneEP } from './scene';

// const migrateMeleeFlags = (data: ItemEntity<ItemType.MeleeWeapon>) => {
//   const { coating, payload } = data.flags[EP.Name] || {};
//   if (coating || payload) {
//     return produce(data, ({ flags }) => {
//       if (!flags.ep2e) return;
//       flags.ep2e.coating =
//         coating &&
//         pipe(coating[0], baseItemMigration, migrateSubstanceFlags, toTuple);
//       flags.ep2e.payload =
//         payload &&
//         pipe(payload[0], baseItemMigration, migrateExplosiveFlags, toTuple);
//     });
//   }
//   return null;
// };
const commonDataObjectKeys = ['name', 'data'] as const;
const { length } = commonDataObjectKeys;
const hasDataObjectKeys = createPipe(
  intersection(commonDataObjectKeys),
  (i) => i.length === length,
);
type DataObject = {
  name: unknown;
  data: unknown;
  [key: string]: unknown;
};
type SystemObject = {
  name: unknown;
  system: unknown;
  [key: string]: unknown;
};
function isDataObject(value: unknown): value is DataObject {
  const is = isObject(value) && hasDataObjectKeys(keys({ ...(value as {}) }));
  return is;
}
function toSystemObject(dataObj: DataObject): SystemObject {
  const { data, ...rest } = dataObj;
  return {
    ...rest,
    '-=data': null,
    system: data,
  };
}

function dataToSystem(originalObj: {}) {
  const newObj: { [key: string]: unknown } = {};

  for (const [key, value] of toPairs(originalObj)) {
    if (Array.isArray(value)) {
      const changed = value.map((v) => {
        if (isDataObject(value)) {
          const asSystem = toSystemObject(v);
          return dataToSystem(asSystem).obj;
        }
        if (isObject(value)) {
          return dataToSystem(v).obj;
        }
        return v;
      });
      newObj[key] = changed;
    } else if (isObject(value)) {
      const obj =
        isDataObject(value) || (key === 'onboardALI' && isObject(value['data']))
          ? toSystemObject(value)
          : value;
      newObj[key] = dataToSystem(obj).obj;
    } else {
      newObj[key] = value;
    }
  }
  const hasChanged = !equals(originalObj, newObj);
  return {
    obj: hasChanged ? newObj : originalObj,
    hasChanged,
  };
}
function getDiffedUpdates(original: object, changed: object) {
  const diffs = foundry.utils.diffObject(original, changed);
  return foundry.utils.flattenObject(diffs);
}
function getCollectionUpdates(sources: readonly { _id: string }[]) {
  const updates: { _id: string }[] = [];
  for (const source of sources) {
    const { obj, hasChanged } = dataToSystem(source);
    if (hasChanged) {
      updates.push({
        _id: source._id,
        ...getDiffedUpdates(source, obj),
      });
    }
  }
  return updates;
}

const documentNamesWithData = new Set(['Actor', 'Item', 'Scene']);

export async function foundry9to10Migration() {
  const { actors, items, messages, scenes } = game;
  const actorUpdates = getCollectionUpdates(actors._source);
  const itemUpdates = getCollectionUpdates(items._source);
  const messageUpdates = getCollectionUpdates(messages._source);
  const sceneUpdates = getCollectionUpdates(scenes._source);
  let hasMigrated = [
    actorUpdates,
    itemUpdates,
    messageUpdates,
    sceneUpdates,
  ].some((u) => u.length > 0);

  if (actorUpdates.length) {
    notify(NotificationType.Info, `Migrating ${actorUpdates.length} actors...`);
    await ActorEP.updateDocuments(actorUpdates);
  }
  if (sceneUpdates.length) {
    notify(NotificationType.Info, `Migrating ${sceneUpdates.length} scenes...`);
    await SceneEP.updateDocuments(sceneUpdates);
  }
  if (messageUpdates.length) {
    notify(
      NotificationType.Info,
      `Migrating ${messageUpdates.length} messages...`,
    );
    await ChatMessageEP.updateDocuments(messageUpdates);
  }

  if (itemUpdates.length) {
    notify(NotificationType.Info, `Migrating ${itemUpdates.length} items...`);
    await ItemEP.updateDocuments(itemUpdates);
  }

  const migratedCompendiums = new Set(
    gameSettings.v10Compendiums.current.filter((id) => game.packs.has(id)),
  );

  const packsWithDocuments: CompendiumCollection[] = [];
  for (const [id, pack] of game.packs.entries()) {
    if (
      documentNamesWithData.has(pack.documentName) &&
      pack.metadata.packageType !== 'system' &&
      !migratedCompendiums.has(id)
    ) {
      packsWithDocuments.push(pack);
    }
  }
  if (packsWithDocuments.length) {
    for (const pack of packsWithDocuments) {
      const { locked } = pack;
      if (locked) {
        await pack.configure({ locked: false });
      }
      await pack.updateAll((value: { toJSON(): {} }) => {
        const val = { ...value.toJSON() };
        const doc = isDataObject(val) ? toSystemObject(val) : val;
        const { obj, hasChanged } = dataToSystem(doc);
        hasMigrated ||= hasChanged;
        return hasChanged ? getDiffedUpdates(doc, obj) : {};
      });
      if (locked) {
        await pack.configure({ locked });
      }
      migratedCompendiums.add(pack.metadata.id);
    }
    await gameSettings.v10Compendiums.update([...migratedCompendiums]);
  } else if (
    !gameSettings.v10Compendiums.current.every((id) =>
      migratedCompendiums.has(id),
    )
  ) {
    // Ensures future compendiums will always be migrated
    await gameSettings.v10Compendiums.update([...migratedCompendiums]);
  }

  if (hasMigrated) {
    location.reload();
  }
}
