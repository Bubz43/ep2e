// export type SuccessTestSelector =
// | { aptitude: AptitudeType }
// | { network: RepIdentifier }
// | {
//     skill:
//       | { skillType: SkillType }
//       | FieldSkillIdentifier;
//   };

import { createFeature, StringID } from './feature-helpers';

export enum HotbarEntryType {
  Macro = 'macro',
  SuccessTest = 'successTest',
  Item = 'item',
}

type Entry<T extends { type: HotbarEntryType }> = T;

export type MacroEntry = Entry<{
  type: HotbarEntryType.Macro;
  macroId: string;
}>;

export type ItemEntry = Entry<{
  type: HotbarEntryType.Item;
  itemId: string;
}>;

// type ItemEntry = {
//   type: HotbarEntryType.Item;
//   itemId: string;
// };

export type HotbarEntryData = MacroEntry | ItemEntry;
export type HotbarCell<T extends HotbarEntryData> = T & { cell: number };
export type UserHotbarEntry = StringID<HotbarCell<MacroEntry>>;

const macro = createFeature<MacroEntry, 'macroId'>(() => ({
  type: HotbarEntryType.Macro,
}));

const item = createFeature<ItemEntry, 'itemId'>(() => ({
  type: HotbarEntryType.Item,
}));

export const createHotbarEntry = {
  macro,
  item,
} as const;
