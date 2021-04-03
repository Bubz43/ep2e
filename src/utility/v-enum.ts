import { literal, union } from '@badrap/valita';
import { enumValues } from '@src/data-enums';
import type { LangEntry } from '@src/foundry/localization';

export const vEnum = <T extends Record<string, LangEntry>>(en: T) => {
  return union(...enumValues(en).map(literal));
};
