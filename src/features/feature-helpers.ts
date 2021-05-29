/* eslint-disable prefer-rest-params */
import { purry, range, createPipe, pipe, identity } from 'remeda';
import type { JsonValue, SetOptional, SetRequired } from 'type-fest';
import { safeMerge } from '../utility/helpers';
import type { UpdateActions } from '../entities/update-store';
import type { FormInstance } from '@src/components/form/forms';
// import type { FormInstance } from 'src/components/form/forms';

type Feature = Record<string, JsonValue | undefined>;

type FeatureWithID = Feature & { id: string };

export type StringID<T extends {}> = T & { id: string };

export const idProp = <T extends { id: string | number }>(item: T) => item.id;

export const stringID = (length = 16) =>
  range(0, length)
    .map(() => Math.random().toString(36)[2])
    .join('');

export const uniqueStringID = (existing: string[]) => {
  let id = stringID();
  while (existing.includes(id)) {
    id = stringID();
  }
  return id;
};

export const addUpdateRemoveFeature = <T extends FeatureWithID>(
  updateList: () => UpdateActions<T[]>['commit'],
): AddUpdateRemoveFeature<T> => {
  const add: FormInstance<Omit<T, 'id'>>['update'] = (changed, orig) => {
    updateList()(addFeature({ ...orig, ...changed }));
  };

  const update: (changed: Partial<T>, original: Pick<T, 'id'>) => void = (
    changed,
    feature,
  ) =>
    updateList()((list) => updateFeature(list, { ...changed, id: feature.id }));

  const remove = (id: string) => updateList()(removeFeature(id));

  const removeCallback = (id: string) => () => remove(id);

  return { update, add, remove, removeCallback };
};

export type AddUpdateRemoveFeature<T extends FeatureWithID> = {
  add: FormInstance<Omit<T, 'id'>>['update'];
  update: (changed: Partial<T>, original: Pick<T, 'id'>) => void;
  remove: (id: string) => void;
  removeCallback: (id: string) => () => void;
};

type CreateFn<T extends Feature, R extends keyof T = never> = (
  seed: SetRequired<Partial<T>, R>,
) => SetOptional<Required<T>, R>;

export const createFeature =
  <T extends Feature, R extends keyof T = never>(
    fn: CreateFn<T, R>,
    transformer: (feature: Required<T>) => Required<T> = identity,
  ) =>
  (seed: SetRequired<Partial<T>, R>) => {
    return transformer(safeMerge(fn(seed), seed) as unknown as Required<T>);
  };

const existingIds = (list: ReadonlyArray<FeatureWithID>) =>
  list.map(({ id }) => id);

export const matchID = (id: string | undefined) => (feature: { id: string }) =>
  id === feature.id;

export function addFeature<T extends FeatureWithID>(
  list: ReadonlyArray<T> | null | undefined,
  feature: Omit<T, 'id'>,
): T[];
export function addFeature<T extends FeatureWithID>(
  feature: Omit<T, 'id'>,
): (list: ReadonlyArray<T> | null | undefined) => T[];
export function addFeature() {
  return purry(_addFeature, arguments);
}

export function removeFeature<T extends FeatureWithID>(
  list: ReadonlyArray<T>,
  id: T['id'],
): T[];
export function removeFeature<T extends FeatureWithID>(
  id: T['id'],
): (list: ReadonlyArray<T>) => T[];
export function removeFeature() {
  return purry(_removeFeature, arguments);
}

export function updateFeature<T extends FeatureWithID>(
  list: ReadonlyArray<T>,
  feature: Partial<T> & Pick<T, 'id'>,
): T[];
export function updateFeature<T extends FeatureWithID>(
  feature: Partial<T> & Pick<T, 'id'>,
): (list: ReadonlyArray<T>) => T[];
export function updateFeature() {
  return purry(_updateFeature, arguments);
}

const _addFeature = <T extends FeatureWithID>(
  list: ReadonlyArray<T> | null | undefined,
  feature: Omit<T, 'id'>,
) =>
  [
    ...(list || []),
    { ...feature, id: uniqueStringID(existingIds(list || [])) },
  ] as T[];

const _updateFeature = <T extends FeatureWithID>(
  list: ReadonlyArray<T>,
  update: Partial<T> & Pick<T, 'id'>,
) => {
  const mutable = [...list];
  const index = mutable.findIndex(matchID(update.id));
  index !== -1 &&
    mutable.splice(index, 1, safeMerge(list[index]!, update) as unknown as T);
  return mutable;
};

const _removeFeature = <T extends FeatureWithID>(
  list: ReadonlyArray<T>,
  id: T['id'],
) => {
  const mutable = [...list];
  const index = mutable.findIndex(matchID(id));
  if (index !== -1) mutable.splice(index, 1);
  return mutable;
};
