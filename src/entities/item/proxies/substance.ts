import { SubstanceApplicationMethod, SubstanceClassification, SubstanceType } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { localize } from '@src/foundry/localization';
import mix from 'mix-with/lib';
import { pipe, uniq, map } from 'remeda';
import type { Stackable } from '../item-interfaces';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

export type SubstanceUse = Substance["applicationMethods"][number] | "use";

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
  
        case "use":
        case "app":
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

  
  get applicationMethods(): ("app" | SubstanceApplicationMethod)[] {
    return this.isElectronic ? ["app"] : this.epData.application;
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
    return !!this.epData.addiction
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
}
