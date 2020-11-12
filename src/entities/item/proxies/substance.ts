import {
  SubstanceApplicationMethod,
  SubstanceClassification,
  SubstanceType,
} from '@src/data-enums';
import { ItemType } from '@src/entities/entity-types';
import type {
  DrugAppliedItem,
  ItemEntity,
  SubstanceItemFlags,
} from '@src/entities/models';
import { UpdateStore } from '@src/entities/update-store';
import { uniqueStringID } from '@src/features/feature-helpers';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { pipe, uniq, map } from 'remeda';
import type { Stackable } from '../item-interfaces';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Sleight } from './sleight';
import { Trait } from './trait';

export type SubstanceUse = Substance['applicationMethods'][number] | 'use';

class Base extends ItemProxyBase<ItemType.Substance> {}
export class Substance
  extends mix(Base).with(Purchasable)
  implements Stackable {
  static onsetTime(application: SubstanceUse) {
    switch (application) {
      case SubstanceApplicationMethod.Inhalation:
        return toMilliseconds({ seconds: 3 });

      case SubstanceApplicationMethod.Dermal:
      case SubstanceApplicationMethod.Injected:
        return toMilliseconds({ seconds: 6 });

      case SubstanceApplicationMethod.Oral:
        return toMilliseconds({ minutes: 15 });

      case 'use':
      case 'app':
        return 0;
    }
  }

  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.Substance> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }

  get applicationMethods(): ('app' | SubstanceApplicationMethod)[] {
    return this.isElectronic ? ['app'] : this.epData.application;
  }

  get quantity() {
    return this.epData.quantity;
  }

  get fullName() {
    return `${this.name} (${this.quantity})`;
  }

  get fullType() {
    return [
      this.category,
      ...pipe([this.classification, this.substanceType], uniq(), map(localize)),
    ].join(' ');
  }

  get category() {
    return this.epData.category;
  }

  get isAddictive() {
    return !!this.epData.addiction;
  }

  get substanceType() {
    return this.epData.substanceType;
  }

  get isDrug() {
    return this.substanceType === SubstanceType.Drug;
  }

  get isToxin() {
    return this.substanceType === SubstanceType.Toxin;
  }

  get isChemical() {
    return this.substanceType === SubstanceType.Chemical;
  }

  get classification() {
    return this.isChemical
      ? SubstanceType.Chemical
      : this.epData.classification;
  }

  get isElectronic() {
    return (
      !this.isChemical &&
      this.classification === SubstanceClassification.Electronic
    );
  }

  get alwaysApplied() {
    return {
      ...this.epData.alwaysApplied,
      items: this.alwaysAppliedItems,
    };
  }

  get severity() {
    return {
      ...this.epData.severity,
      items: this.severityAppliedItems,
    };
  }

  @LazyGetter()
  get alwaysAppliedItems() {
    return this.getInstancedItems('alwaysAppliedItems');
  }

  @LazyGetter()
  get severityAppliedItems() {
    return this.getInstancedItems('severityAppliedItems');
  }

  get hasSeverity() {
    return this.epData.hasSeverity;
  }

  private getInstancedItems(
    group: 'alwaysAppliedItems' | 'severityAppliedItems',
  ) {
    return new Map(
      this.epFlags?.[group]?.map((item, index, list) => {
        const commonInit = {
          embedded: this.name,
          lockSource: false,
          alwaysDeletable: this.editable,
          deleteSelf: () =>
            this.updater.prop('flags', EP.Name, group).commit((items) => {
              const set = new Set(items || []);
              set.delete(item);
              return [...set];
            }),
        };
        return [
          item._id,
          item.type === ItemType.Trait
            ? new Trait({
                data: item,
                ...commonInit,
                updater: new UpdateStore({
                  getData: () => item,
                  isEditable: () => this.editable,
                  setData: (updated) => {
                    const updatedList = [...list];
                    updatedList[index] = mergeObject(item, updated, {
                      inplace: false,
                    });
                    this.updater
                      .prop('flags', EP.Name, group)
                      .commit(updatedList);
                  },
                }),
              })
            : new Sleight({
                data: item,
                ...commonInit,
                updater: new UpdateStore({
                  getData: () => item,
                  isEditable: () => this.editable,
                  setData: (updated) => {
                    const updatedList = [...list];
                    updatedList[index] = mergeObject(item, updated, {
                      inplace: false,
                    });
                    this.updater
                      .prop('flags', EP.Name, group)
                      .commit(updatedList);
                  },
                }),
              }),
        ];
      }) || [],
    );
  }

  addItemEffect(group: keyof SubstanceItemFlags, itemData: DrugAppliedItem) {
    this.updater.prop('flags', EP.Name, group).commit((items) => {
      const changed = [...(items || [])];
      const _id = uniqueStringID(changed.map((i) => i._id));
      return [...changed, { ...itemData, _id }] as typeof changed;
    });
  }
}
