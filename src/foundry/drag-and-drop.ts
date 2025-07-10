import { enumValues } from '@src/data-enums';
import { ActorEP } from '@src/entities/actor/actor';
import type { ActorIdentifiers } from '@src/entities/find-entities';
import { ItemEP } from '@src/entities/item/item';
import type { ActorEntity, ItemEntity } from '@src/entities/models';
import { Effect, EffectType } from '@src/features/effects';
import type { StringID } from '@src/features/feature-helpers';
import {
  HotbarCell,
  HotbarEntryData,
  HotbarEntryType,
} from '@src/features/hotbar-entry';
import {
  PsiInfluenceData,
  PsiInfluenceType,
} from '@src/features/psi-influence';
import { SuccessTestInitInfo, successTestInitInfoSchema } from '@src/global';
import { isJsonObject } from '@src/utility/helpers';
import { createPipe } from 'remeda';
import type { JsonObject } from 'type-fest';
import type { EntityName } from './foundry-cont';

const source: {
  element: HTMLElement | null | undefined;
  data: Drop | null | undefined;
} = { element: null, data: null };

const parseData = (ev: DragEvent) => {
  const stringifiedData = ev.dataTransfer?.getData('text/plain');
  let drop: null | unknown = null;
  try {
    drop = typeof stringifiedData === 'string' && JSON.parse(stringifiedData);
  } catch {
    drop = null;
  }
  return {
    ev,
    drop,
    srcEl: source.element,
    data: source.data || (isKnownDrop(drop) ? drop : null),
  };
};

type KnownDrop<T extends { type: DropType }> = T;

export type Drop = Drops[DropType];

type DropHandler = (info: ReturnType<typeof parseData>) => void;

type UnknownValues<T> = {
  [key in keyof T]?: unknown;
};

const dropChecker =
  <T extends DropType, D = Drops[T]>(
    type: T,
    finalCheck: (obj: UnknownValues<D> & { type: T }) => boolean,
  ) =>
    (droppedData: unknown): droppedData is D => {
      return !!(
        isJsonObject(droppedData) &&
        droppedData['type'] === type &&
        finalCheck(droppedData as JsonObject & { type: T })
      );
    };

export const dragSource = () => source as Readonly<typeof source>;

const setDragImage = (el: HTMLElement) => {
  let dragImage = document.querySelector('.drag-image');
  if (!dragImage) {
    dragImage = document.createElement('div');
    dragImage.classList.add('drag-image');
    document.body.append(dragImage);
  }
  dragImage.textContent = el.textContent;
  return dragImage;
};

export const onlySetDragSource = (ev: DragEvent, drop: Drop) => {
  const el = ev
    .composedPath()
    .find(
      (e) => e instanceof HTMLElement && e.getAttribute('draggable') === 'true',
    ) as HTMLElement | undefined;

  el?.addEventListener(
    'dragend',
    () => {
      source.element = null;
      source.data = null;
    },
    { once: true },
  );

  if (
    el instanceof HTMLElement &&
    el.textContent &&
    !el.matches('.directory-item')
  ) {
    ev.dataTransfer?.setDragImage(setDragImage(el), 20, 20);
  }

  source.element = el;
  source.data = drop;
};

export enum DropType {
  Macro = 'Macro',
  HotbarEntryData = 'HotbarEntryData',
  FullHotbarEntry = 'FullHotbarEntry',
  Roll = 'Roll',
  Item = 'Item',
  Effect = 'EP-Effect',
  PsiInfluence = 'EP-PsiInfluence',
  Actor = 'Actor',
  Scene = 'Scene',
  JournalEntry = 'JournalEntry',
  RollTable = 'RollTable',
  Playlist = 'Playlist',
  Folder = 'Folder',
  SuccessTestInfo = 'SuccessTestInfo',
}

type MacroDrop = KnownDrop<{ id: string; type: DropType.Macro }>;
type HotbarEntryDataDrop = KnownDrop<{
  type: DropType.HotbarEntryData;
  data: HotbarEntryData;
}>;
type FullHotbarEntry = KnownDrop<{
  type: DropType.FullHotbarEntry;
  data: StringID<HotbarCell<HotbarEntryData>>;
}>;

type RollDrop = KnownDrop<{
  type: DropType.Roll;
  messageId: string;
  roll: number;
  formula: string;
  flavor: string;
}>;

export type SimpleDrop<T extends DropType> = KnownDrop<{
  type: T;
  uuid: string;
}>;

export type ActorDrop =
  | KnownDrop<{ type: DropType.Actor; data: ActorEntity }>
  | SimpleDrop<DropType.Actor>;

export type PlayListDrop = SimpleDrop<DropType.Playlist>;
export type RollTableDrop = SimpleDrop<DropType.RollTable>;
export type JournalEntryDrop = SimpleDrop<DropType.JournalEntry>;
export type SceneDrop = SimpleDrop<DropType.Scene>;

export type ItemDrop =
  | KnownDrop<{
    type: DropType.Item;
    data: ItemEntity;
  }>
  | SimpleDrop<DropType.Item>;

type EffectDrop = KnownDrop<{ type: DropType.Effect; effect: Effect }>;

type PsiInfluenceDrop = KnownDrop<{
  type: DropType.PsiInfluence;
  influence: PsiInfluenceData;
}>;

type FolderDrop = KnownDrop<{
  type: DropType.Folder;
  id: string;
  entity: EntityName;
}>;

type SuccessTestDrop = KnownDrop<{
  type: DropType.SuccessTestInfo;
  successTest: SuccessTestInitInfo;
}>;

type Drops = {
  [DropType.Macro]: MacroDrop;
  [DropType.HotbarEntryData]: HotbarEntryDataDrop;
  [DropType.FullHotbarEntry]: FullHotbarEntry;
  [DropType.Roll]: RollDrop;
  [DropType.Item]: ItemDrop;
  [DropType.Effect]: EffectDrop;
  [DropType.PsiInfluence]: PsiInfluenceDrop;
  [DropType.Actor]: ActorDrop;
  [DropType.JournalEntry]: JournalEntryDrop;
  [DropType.Playlist]: PlayListDrop;
  [DropType.Scene]: SceneDrop;
  [DropType.RollTable]: RollTableDrop;
  [DropType.Folder]: FolderDrop;
  [DropType.SuccessTestInfo]: SuccessTestDrop;
};

const isMacro = dropChecker(DropType.Macro, ({ id }) => typeof id === 'string');

const isHotbarEntry = (
  data: unknown,
): data is JsonObject & { type: HotbarEntryType } => {
  return (
    isJsonObject(data) &&
    (Object.values(HotbarEntryType) as unknown[]).includes(data['type'])
  );
};

const isHotbarEntryData = dropChecker(DropType.HotbarEntryData, ({ data }) => {
  return isHotbarEntry(data);
});

const isFullHotbarEntry = dropChecker(
  DropType.FullHotbarEntry,
  ({ data }) =>
    isHotbarEntry(data) &&
    typeof data['id'] === 'string' &&
    typeof data['cell'] === 'number',
);

const isRollDrop = dropChecker(
  DropType.Roll,
  ({ messageId, roll, formula, flavor }) => {
    return (
      typeof messageId === 'string' &&
      typeof roll === 'number' &&
      typeof formula === 'string' &&
      typeof flavor === 'string'
    );
  },
);

const isItemDrop = dropChecker(DropType.Item, (itemDrop) => {
  return (
    'uuid' in itemDrop || ('data' in itemDrop && isJsonObject(itemDrop.data))
  );
});

const isEffectDrop = dropChecker(DropType.Effect, ({ effect }) => {
  return (
    isJsonObject(effect) &&
    enumValues(EffectType).some((t) => t === effect['type'])
  );
});

const isInfluenceDrop = dropChecker(DropType.PsiInfluence, ({ influence }) => {
  return (
    isJsonObject(influence) &&
    typeof influence['type'] === 'string' &&
    (enumValues(PsiInfluenceType) as string[]).includes(influence['type'])
  );
});

const simpleDropCheck = ({ uuid }: { uuid?: unknown }) => {
  return !!(typeof uuid === 'string' && uuid.length > 0);
};

const isActorDrop = dropChecker(DropType.Actor, (actorDrop) => {
  return (
    'uuid' in actorDrop || ('data' in actorDrop && isJsonObject(actorDrop.data))
  );
});

const isSceneDrop = dropChecker(DropType.Scene, simpleDropCheck);
const isPlaylistDrop = dropChecker(DropType.Playlist, simpleDropCheck);
const isRollTableDrop = dropChecker(DropType.RollTable, simpleDropCheck);
const isJournalEntryDrop = dropChecker(DropType.JournalEntry, simpleDropCheck);
const isFolderDrop = dropChecker(
  DropType.Folder,
  ({ id, entity }) => !!(id && typeof entity === 'string'),
);

const isSuccessTestInfo = dropChecker(DropType.SuccessTestInfo, (data) => {
  try {
    successTestInitInfoSchema.parse(data.successTest);
    return true;
  } catch (error) {
    return false;
  }
});

const droppedChecks: Record<DropType, (dropped: unknown) => boolean> = {
  [DropType.Macro]: isMacro,
  [DropType.HotbarEntryData]: isHotbarEntryData,
  [DropType.FullHotbarEntry]: isFullHotbarEntry,
  [DropType.Roll]: isRollDrop,
  [DropType.Item]: isItemDrop,
  [DropType.Effect]: isEffectDrop,
  [DropType.PsiInfluence]: isInfluenceDrop,
  [DropType.Actor]: isActorDrop,
  [DropType.Scene]: isSceneDrop,
  [DropType.Playlist]: isPlaylistDrop,
  [DropType.RollTable]: isRollTableDrop,
  [DropType.JournalEntry]: isJournalEntryDrop,
  [DropType.Folder]: isFolderDrop,
  [DropType.SuccessTestInfo]: isSuccessTestInfo,
};

export const isKnownDrop = (droppedData: unknown): droppedData is Drop => {
  return !!(
    isJsonObject(droppedData) &&
    typeof droppedData['type'] === 'string' &&
    droppedData['type'] in droppedChecks &&
    droppedChecks[droppedData['type'] as DropType](droppedData)
  );
};

export const handleDrop = (handler: DropHandler) =>
  createPipe(parseData, handler);

export const dragValue = (check: unknown) => (check ? 'true' : 'false');

export const setDragDrop = (ev: DragEvent, drop: Drop) => {
  onlySetDragSource(ev, drop);
  ev.dataTransfer?.setData('text/plain', JSON.stringify(drop));
};

export const itemDropToItemProxy = async (drop: ItemDrop) => {
  if ('data' in drop) {
    return new ItemEP(drop.data, {}).proxy;
  }
  const item: ItemEP | null = await (Item.implementation as any).fromDropData(
    drop,
  );
  return item ? item.proxy : null;
  // if ('pack' in drop && drop.pack) {
  //   const pack = game.packs.get(drop.pack);
  //   const item = await pack?.getDocument(drop.id);
  //   if (item instanceof ItemEP) return item.proxy;
  // } else if ('id' in drop) {
  //   return game.items.get(drop.id)?.proxy;
  // } else {
  //   const actor = drop.tokenId
  //     ? game.actors.tokens[drop.tokenId] ||
  //       (drop.actorId ? game.actors.get(drop.actorId) : null)
  //     : drop.actorId
  //     ? game.actors.get(drop.actorId)
  //     : null;
  //   return (
  //     actor?.items?.get(drop.data?._id)?.proxy ||
  //     new ItemEP(drop.data, {}).proxy
  //   );
  // }
  // return null;
};

export const actorDroptoActorProxy = async (drop: ActorDrop) => {
  if ('data' in drop) {
    return new ActorEP(drop.data, {}).proxy;
  }
  const actor: ActorEP | null = await (
    Actor.implementation as any
  ).fromDropData(drop);
  return actor ? actor.proxy : null;

  // if ('data' in drop) return new ActorEP(drop.data, {}).proxy;
  // if ('pack' in drop && drop.pack) {
  //   const pack = game.packs.get(drop.pack);
  //   const actor = await pack?.getDocument(drop.id);
  //   if (actor instanceof ActorEP) return actor.proxy;
  // } else if ('id' in drop) {
  //   return game.actors.get(drop.id)?.proxy;
  // }
  // return null;
};

export const effectDrag = (effect: Effect) => (ev: DragEvent) =>
  setDragDrop(ev, { type: DropType.Effect, effect });
