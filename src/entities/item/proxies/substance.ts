import { SubstanceClassification, SubstanceType } from '@src/data-enums';
import type { ItemType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import mix from 'mix-with/lib';
import { pipe, uniq, map } from 'remeda';
import type { Stackable } from '../item-interfaces';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Substance> {}
export class Substance extends mix(Base).with(Purchasable) implements Stackable {
  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.Substance> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }

  get quantity() {
    return this.epData.quantity
  }


  get fullName() {
    return `${this.name} (${this.quantity})`
  }

  get fullType() {
    return [
      this.category,
      ...pipe([this.classification, this.substanceType], uniq(), map(localize)),
    ].join(" ");
  }

  get category() {
    return this.epData.category;
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
