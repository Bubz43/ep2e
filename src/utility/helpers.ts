/* eslint-disable @typescript-eslint/no-explicit-any */
import type { JsonObject, JsonValue, UnionToIntersection } from 'type-fest';
import type { OmitByValue } from 'utility-types';

type FromEntries<T extends readonly [PropertyKey, any]> = T extends T
  ? Record<T[0], T[1]>
  : never;

type Flatten<T> = {} & {
  [P in keyof T]: T[P];
};

type SizableObject = { length?: number; size?: number };

export const isJsonObject = (value: unknown): value is JsonObject =>
  !!(
    value &&
    typeof value === 'object' &&
    Object.getPrototypeOf(value) === Object.prototype
  );

export const notEmpty = <T extends SizableObject>(
  obj: T | undefined | null,
): obj is T =>
  obj ? !!(obj.length ?? obj.size ?? Object.keys(obj).length) : false;

export const toggle = (bool: boolean | undefined | null) => !bool;

export const fromPairs = <
  K extends PropertyKey,
  T extends [readonly [K, any]] | ReadonlyArray<readonly [K, any]>
>(
  entries: T,
) =>
  Object.fromEntries(entries) as Flatten<
    UnionToIntersection<FromEntries<T[number]>>
  >;

const omitUndefined = <T extends MergableObject>(obj: T) => {
  const copy = { ...obj };
  for (const [key, value] of Object.entries(copy)) {
    if (value === undefined) delete copy[key];
  }
  return copy as OmitByValue<T, undefined>;
};

type MergableObject = Record<PropertyKey, JsonValue | undefined>;
/**
 * Removes any values of undefined from objects, then returns merged object.
 * @param baseObject the first object
 * @param overridingObject the second object. Overwrites a.
 */
export const safeMerge = <A extends MergableObject, B extends MergableObject>(
  baseObject: A,
  overridingObject: B,
) => ({ ...omitUndefined(baseObject), ...omitUndefined(overridingObject) });

export const whenNotEmpty = <T extends SizableObject, N, E>(
  obj: T | null | undefined,
  isNotEmpty: (obj: T) => N,
  { whenEmpty }: { whenEmpty?: (obj: T | null | undefined) => E } = {},
) => (notEmpty(obj) ? isNotEmpty(obj) : whenEmpty?.(obj));

export const listOrEmptyString = <T extends SizableObject, L>(
  list: T | null | undefined,
  cb: (list: T) => L,
) => {
  return whenNotEmpty(list, cb, { whenEmpty: () => '' }) ?? '';
};

export const clickIfEnter = ({ key, currentTarget }: KeyboardEvent) =>
  key === 'Enter' &&
  currentTarget instanceof HTMLElement &&
  !currentTarget.hasAttribute('disabled') &&
  currentTarget.click();

const replacer = /[-\/\\^$*+?.()|[\]{}]/g;

// TODO run all filters through this fn
export const searchRegExp = (search: string) =>
  new RegExp(search.replace(replacer, '\\$&'), 'i');

export const nonNegative = (val: number) => (val < 0 ? 0 : val);

export const withSign = (val: number) => `${val < 0 ? '' : '+'}${val}`;
