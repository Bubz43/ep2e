/* eslint-disable @typescript-eslint/no-explicit-any */
import { equals, first } from 'remeda';
import type { JsonObject, JsonValue } from 'type-fest';
import type { DeepPartial } from 'utility-types';
import type { NonFunction, ValOrValFN } from '../utility/helper-types';
import { isJsonObject, notEmpty } from '../utility/helpers';

// TODO: Make this not take a partial if value of T can be null/undefined
type SameTypeFunc<T, C, V = T extends any[] ? T : Partial<T>> = (
  newValue: V | ((originalValue: T) => V),
) => C;

type UpdateStoreData = { [x: string]: unknown };

export type UpdateActions<T> = UpdateStoreActions<T, unknown>;

type UpdateStoreActions<T, C> = Readonly<{
  store: SameTypeFunc<T, C>;
  originalValue: () => T;
  commit: SameTypeFunc<T, Promise<C>>;
  append: (updater: UpdateStore<T extends UpdateStoreData ? T : never>) => C;
  nestedStore: () => T extends UpdateStoreData ? UpdateStore<T> : never;
  clearNestedStore: () => boolean;
}>;

type DataCallbacks<T extends UpdateStoreData> = {
  getData: () => T;
  isEditable: () => boolean;
  setData: (
    data: DeepPartial<T>,
    store: UpdateStore<T>,
  ) => unknown | Promise<unknown>;
};

export class UpdateStore<T extends UpdateStoreData, O extends keyof T = never> {
  constructor(private callbacks: DataCallbacks<T>) {}
  private updatedData = {} as DeepPartial<T>;
  private _editable = false;
  private recheckEditable = true;
  private actionCache = new Map<string, UpdateStoreActions<any, this>>();

  private nestedStores = new Map<
    string,
    {
      store: UpdateStore<any>;
      appendStore: () => UpdateStore<any>;
    }
  >();

  private getData() {
    return this.callbacks.getData();
  }

  get currentUpdate() {
    return this.updatedData;
  }

  get editable() {
    if (this.recheckEditable) {
      this._editable = this.callbacks.isEditable();
      this.recheckEditable = false;
    }
    return this._editable;
  }

  private async commitData() {
    if (!this.editable) {
      throw new Error('Cannot commit data as UpdateStore is non editable.');
    }
    if (this.isEmpty === false) {
      this.appendNestedStores();
      const { updatedData } = this;
      await this.callbacks.setData(updatedData, this as UpdateStore<any>);
      this.updatedData = {} as DeepPartial<T>;
    }

    return this;
  }

  get isEmpty(): boolean {
    return (
      !notEmpty(this.updatedData) &&
      [...this.nestedStores.values()].every(({ store }) => store.isEmpty)
    );
  }

  private appendNestedStores() {
    this.nestedStores.forEach(({ appendStore }) => appendStore());
    return this;
  }

  protected getAndClearUpdateData() {
    this.appendNestedStores();
    const { updatedData } = this;
    this.updatedData = {} as DeepPartial<T>;
    return updatedData;
  }

  private setValue(
    keys: string[],
    value: JsonValue | undefined,
    originalValue: JsonValue | undefined,
  ) {
    if (equals(value, originalValue)) return this;
    const finalIndex = keys.length - 1;
    const finalValue =
      isJsonObject(value) && isJsonObject(originalValue)
        ? Object.entries(value).reduce((accum, [key, value]) => {
            if (value !== undefined && !equals(value, originalValue[key]))
              accum[key] = value;
            return accum;
          }, {} as JsonObject)
        : value;

    if (finalIndex === 0 && keys[0] === '' && isJsonObject(finalValue)) {
      for (const [key, value] of Object.entries(finalValue)) {
        (this.updatedData as JsonObject)[key] = value;
      }
      return this;
    }

    keys.reduce((obj, key, index) => {
      if (index === finalIndex) {
        if (finalValue === undefined && first(keys) === 'flags')
          obj[`-=${key}`] = null;
        else {
          const current = obj[key];
          obj[key] =
            isJsonObject(current) && isJsonObject(finalValue)
              ? { ...current, ...finalValue }
              : finalValue;
        }

        return obj;
      }
      if (!Reflect.has(obj, key)) obj[key] = {};
      return obj[key] as JsonObject;
    }, this.updatedData as JsonObject);

    return this;
  }

  readonly commit = () => this.commitData();

  static prepUpdateMany<T extends { _id: string }>(updaters: UpdateStore<T>[]) {
    return updaters.flatMap((updater) =>
      updater.isEmpty
        ? []
        : { ...updater.getAndClearUpdateData(), _id: updater.getData()._id },
    );
  }

  prop(k1: ''): UpdateStoreActions<T, this>;

  prop<K1 extends Exclude<keyof T, O>>(k1: K1): UpdateStoreActions<T[K1], this>;

  prop<K1 extends Exclude<keyof T, O>, K2 extends keyof T[K1]>(
    k1: K1,
    k2: K2,
  ): UpdateStoreActions<T[K1][K2], this>;

  prop<
    K1 extends Exclude<keyof NonNullable<T>, O>,
    K2 extends keyof NonNullable<NonNullable<T>[K1]>,
    K3 extends keyof NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>
  >(
    k1: K1,
    k2: K2,
    k3: K3,
  ): UpdateStoreActions<
    NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3],
    this
  >;

  prop<
    K1 extends Exclude<keyof NonNullable<T>, O>,
    K2 extends keyof NonNullable<NonNullable<T>[K1]>,
    K3 extends keyof NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>,
    K4 extends keyof NonNullable<
      NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3]
    >
  >(
    k1: K1,
    k2: K2,
    k3: K3,
    k4: K4,
  ): UpdateStoreActions<
    NonNullable<NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3]>[K4],
    this
  >;

  prop<
    K1 extends Exclude<keyof NonNullable<T>, O>,
    K2 extends keyof NonNullable<NonNullable<T>[K1]>,
    K3 extends keyof NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>,
    K4 extends keyof NonNullable<
      NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3]
    >,
    K5 extends keyof NonNullable<
      NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3]
    >[K4]
  >(
    k1: K1,
    k2: K2,
    k3: K3,
    k4: K4,
    k5: K5,
  ): UpdateStoreActions<
    NonNullable<
      NonNullable<NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3]>[K4]
    >[K5],
    this
  >;

  prop<
    K1 extends Exclude<keyof NonNullable<T>, O>,
    K2 extends keyof NonNullable<NonNullable<T>[K1]>,
    K3 extends keyof NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>,
    K4 extends keyof NonNullable<
      NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3]
    >,
    K5 extends keyof NonNullable<
      NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3]
    >[K4],
    K6 extends keyof NonNullable<
      NonNullable<NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3]>[K4]
    >[K5]
  >(
    k1: K1,
    k2: K2,
    k3: K3,
    k4: K4,
    k5: K5,
    k6: K6,
  ): UpdateStoreActions<
    NonNullable<
      NonNullable<NonNullable<NonNullable<NonNullable<T>[K1]>[K2]>[K3]>[K4]
    >[K5][K6],
    this
  >;

  prop(...keys: string[]) {
    const path = keys.join('.');

    const savedActions = this.actionCache.get(path);
    if (savedActions) return savedActions;

    const clearNestedStore = () => this.nestedStores.delete(path);
    // TODO Maybe return the current stored value in updateData if it has been set instead of original
    const originalValue = (): any => {
      if (path === '') return this.getData();
      return keys.reduce(
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        (result, key) => (result ?? {})[key],
        this.getData() as JsonObject,
      );
    };

    const store = (newVal: ValOrValFN<NonFunction>) => {
      const original = originalValue();
      const setVal = typeof newVal === 'function' ? newVal(original) : newVal;
      if (setVal == null && this.nestedStores.has(path)) clearNestedStore();
      return this.setValue(keys, setVal, original);
    };

    const append = (updater: UpdateStore<any>) => {
      return updater.isEmpty ? this : store(updater.getAndClearUpdateData());
    };

    const actions = {
      store,
      originalValue,
      append,
      commit: (newVal: ValOrValFN<NonFunction>) => store(newVal).commitData(),
      nestedStore: (): any => this.makeNested({ path, append, originalValue }),
      clearNestedStore,
    };

    this.actionCache.set(path, actions);
    return actions;
  }

  private makeNested({
    path,
    append,
    originalValue,
  }: {
    path: string;
    append: (store: UpdateStore<any>) => UpdateStore<any>;
    originalValue: () => any;
  }) {
    if (!isJsonObject(originalValue())) {
      throw new Error('Can only get a nested store for object properties.');
    }
    const existing = this.nestedStores.get(path);
    if (existing) return existing.store;

    const nested = new UpdateStore<any>({
      getData: originalValue,
      isEditable: this.callbacks.isEditable,
      setData: (_, nestedStore) => append(nestedStore).commitData(),
    });
    this.nestedStores.set(path, {
      store: nested,
      appendStore: () => {
        nested.appendNestedStores();
        return append(nested);
      },
    });

    return nested;
  }
}
