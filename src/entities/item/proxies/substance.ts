import {
  createBaseAttackFormula,
  SubstanceAttack,
  SubstanceAttackData,
} from '@src/combat/attacks';
import {
  SubstanceApplicationMethod,
  SubstanceClassification,
  SubstanceType,
} from '@src/data-enums';
import { ItemType } from '@src/entities/entity-types';
import {
  DrugAppliedItem,
  ItemEntity,
  setupItemOperations,
  SubstanceItemFlags,
} from '@src/entities/models';
import { UpdateStore } from '@src/entities/update-store';
import { uniqueStringID } from '@src/features/feature-helpers';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { createPipe, map, merge, pipe, uniq } from 'remeda';
import type { Attacker } from '../item-interfaces';
import { Copyable, Purchasable, Stackable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Sleight } from './sleight';
import { Trait } from './trait';

export type SubstanceUse = Substance['applicationMethods'][number] | 'use';

class Base extends ItemProxyBase<ItemType.Substance> {}
export class Substance
  extends mix(Base).with(Purchasable, Copyable, Stackable)
  implements Attacker<SubstanceAttackData, SubstanceAttack> {
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
      damage: this.attacks.primary,
      items: this.alwaysAppliedItems,
    };
  }

  get severity() {
    return {
      ...this.epData.severity,
      damage: this.setupAttack(
        this.epData.severity.damage,
        localize('severity'),
      ),
      items: this.severityAppliedItems,
    };
  }

  @LazyGetter()
  get attacks() {
    return {
      primary: this.setupAttack(
        this.epData.alwaysApplied.damage,
        localize('alwaysApplied'),
      ),
      secondary: this.hasSeverity
        ? this.setupAttack(this.epData.severity.damage, localize('severity'))
        : null,
    };
  }

  setupAttack(
    { damageFormula, ...data }: SubstanceAttackData,
    defaultLabel: string,
  ): SubstanceAttack {
    return {
      ...data,
      label: this.hasSeverity ? defaultLabel : '',
      rollFormulas: damageFormula
        ? [createBaseAttackFormula(damageFormula)]
        : [],
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
    const items = new Map<string, Trait | Sleight>();
    const ops = setupItemOperations((datas) =>
      this.updater
        .prop('flags', EP.Name, group)
        .commit((items) => datas(items || []) as typeof items),
    );

    const proxyInit = <T extends ItemType>(data: ItemEntity<T>) => {
      return {
        data,
        embedded: this.name,
        lockSource: false,
        alwaysDeletable: this.editable,
        deleteSelf: () => ops.remove(data._id),
        updater: new UpdateStore({
          getData: () => data,
          isEditable: () => this.editable,
          setData: createPipe(merge({ _id: data._id }), ops.update),
        }),
      };
    };

    for (const itemData of this.epFlags?.[group] || []) {
      items.set(
        itemData._id,
        itemData.type === ItemType.Trait
          ? new Trait(proxyInit(itemData))
          : new Sleight(proxyInit(itemData)),
      );
    }
    return items;
  }

  addItemEffect(group: keyof SubstanceItemFlags, itemData: DrugAppliedItem) {
    this.updater.prop('flags', EP.Name, group).commit((items) => {
      const changed = [...(items || [])];
      const _id = uniqueStringID(changed.map((i) => i._id));
      return [...changed, { ...itemData, _id }] as typeof changed;
    });
  }
}
