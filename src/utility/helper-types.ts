import type { JsonValue } from 'type-fest';

// TODO: This type isn't correct
export type NonFunction = JsonValue | object | undefined;

export type ValOrValFN<T extends NonFunction, A = undefined> =
  | T
  | PossibleArg<T, A>;

export type PossibleArg<R, A = undefined> = (
  ...arg: undefined extends A ? [A?] : [A]
) => R;

export type ValueSetter<T> = T extends Function ? never : T | ((currentValue: T) => T)