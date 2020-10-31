import type { Lang, Formatable } from './lang-schema';
import { EP } from './system';

const localizedCache = new Map<string, string>();
type NestedLangEnty = 'SHORT' | 'FULL' | 'DESCRIPTIONS';
export type LangEntry = Exclude<
  keyof Lang[EP.LocalizationNamespace],
  NestedLangEnty
>;

export function localize<
  K1 extends NestedLangEnty,
  K2 extends keyof Lang[EP.LocalizationNamespace][K1]
>(k1: K1, k2: K2): string;
export function localize<K1 extends LangEntry>(k1: K1): string;
export function localize(...keys: string[]) {
  const fullPath = [EP.LocalizationNamespace, ...keys].join('.');
  let localized = localizedCache.get(fullPath);
  if (typeof localized !== 'string') {
    localized = (game?.i18n.localize(fullPath) as string) || fullPath;
    if (localized === fullPath || !localized) {
      localized = keys.join('.');
      console.log(`${localized} - was not localized.`);
    }
    localizedCache.set(fullPath, localized);
  }
  return localized;
}

export function format<T extends keyof Formatable>(
  key: T,
  data: Record<Formatable[T][number], string | number>,
) {
  return (game?.i18n.format(
    `${EP.LocalizationNamespace}.FORMATABLE.${key}`,
    data,
  ) || key) as string;
}
