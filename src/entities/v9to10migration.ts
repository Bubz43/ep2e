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
  return isObject(value) && hasDataObjectKeys(keys(value));
}
function toSystemObject(dataObj: DataObject): SystemObject {
  const { data, ...rest } = dataObj;
  return {
    ...rest,
    '-=data': null,
    system: data,
  };
}
type DocumentObject = {
  [key: string]: unknown;
};
function dataToSystem(originalObj: {}) {
  const newObj: { [key: string]: unknown } = {};

  for (const [key, value] of toPairs(originalObj)) {
    if (Array.isArray(value)) {
      const changed = value.map((v) => {
        if (isDataObject(value)) {
          const asSystem = toSystemObject(v);
          return dataToSystem(asSystem).obj;
        }
        return v;
      });
      newObj[key] = changed;
    } else if (isObject(value)) {
      const obj = isDataObject(value) ? toSystemObject(value) : value;
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
  if (actorUpdates.length) {
    console.log('updating actors', actorUpdates.length);
    ActorEP.updateDocuments;
  }
  if (itemUpdates.length) {
    console.log('updating items', itemUpdates.length);
    ItemEP.updateDocuments;
  }
  if (messageUpdates.length) {
    console.log('updating messages', messageUpdates.length);
    ChatMessageEP.updateDocuments;
  }
  if (sceneUpdates.length) {
    console.log('updating scenes', sceneUpdates.length);
    SceneEP.updateDocuments;
  }
  const packsWithDocuments: CompendiumCollection[] = [];
  for (const [_, pack] of game.packs.entries()) {
    if (documentNamesWithData.has(pack.documentName))
      packsWithDocuments.push(pack);
  }
  // for (const pack of packsWithDocuments) {
  //   await pack.updateAll((value: {}) => {
  //     const { obj, hasChanged } = dataToSystem(value);
  //     return hasChanged ? getDiffedUpdates(value, obj) : {};
  //   });
  // }
}
