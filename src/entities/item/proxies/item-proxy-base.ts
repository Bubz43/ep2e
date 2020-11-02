import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { noop } from 'remeda';
import type { Mutable } from 'type-fest';
import type { ItemType } from '../../entity-types';
import type { ItemEntity, NonEditableProps } from '../../models';
import { UpdateStore } from '../../update-store';

export type ItemProxyInit<T extends ItemType> = {
  data: ItemEntity<T>;
  updater?: UpdateStore<ItemEntity<T>>;
  embedded: string | null | undefined;
  openForm?: () => void;
  deleteSelf?: () => void;
  alwaysDeletable?: boolean;
};

export abstract class ItemProxyBase<T extends ItemType> {
  readonly data;
  readonly updater: UpdateStore<ItemEntity<T>>;
  readonly openForm?;
  readonly deleteSelf?;
  readonly alwaysDeletable: boolean;

  embedded;
  usable = true;

  abstract get fullName(): string;
  abstract getTextInfo(): string[];

  constructor({
    data,
    updater,
    embedded,
    openForm,
    deleteSelf,
    alwaysDeletable = false,
  }: ItemProxyInit<T>) {
    this.data = data;
    this.updater =
      updater ??
      new UpdateStore({
        setData: noop,
        isEditable: () => false,
        getData: () => data,
      });
    this.embedded = embedded;
    this.openForm = openForm;
    this.deleteSelf = deleteSelf;
    this.alwaysDeletable = alwaysDeletable;
    // this.actorIdentifiers = actorIdentifiers;
  }

  get name() {
    return this.data.name;
  }

  get type() {
    return this.data.type;
  }

  get fullType() {
    return localize(this.type);
  }

  get img() {
    return this.data.img;
  }

  get nonDefaultImg() {
    const { img } = this;
    return img === CONST.DEFAULT_TOKEN ? undefined : img;
  }

  get description() {
    return this.epData.description;
  }

  get editable() {
    return this.updater.editable;
  }

  protected get epData() {
    return this.data.data;
  }

  getDataCopy(resetState = true) {
    const { data } = this;
    return duplicate(data) as Mutable<typeof data>;
  }

  get id() {
    return this.data._id;
  }

  get _id() {
    return this.data._id;
  }

  get sort() {
    return this.data.sort || 0;
  }

  get epFlags() {
    return this.data.flags[EP.Name];
  }
}
