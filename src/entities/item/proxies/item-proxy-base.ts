import type { MessageHeaderData } from '@src/chat/message-data';
import type { ActorEP } from '@src/entities/actor/actor';
import type { EntityPath } from '@src/entities/path';
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
  actor?: ActorEP | null;
  path?: EntityPath
};

export abstract class ItemProxyBase<T extends ItemType> {
  readonly data;
  readonly updater: UpdateStore<ItemEntity<T>>;
  readonly openForm?;
  readonly deleteSelf?;
  readonly alwaysDeletable: boolean;
  readonly actor;
  embedded;
  usable = true;
  readonly path;

  constructor({
    data,
    updater,
    embedded,
    openForm,
    deleteSelf,
    alwaysDeletable = false,
    actor,
    path
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
    this.actor = actor;
    this.path = path
    // this.actorIdentifiers = actorIdentifiers;
  }

  get dataActions() {
    return this.updater.path('data').commit;
  }

  get textInfo(): string[] {
    return [];
  }

  get tags(): string[] {
    return [];
  }

  get name() {
    return this.data.name;
  }

  get type() {
    return this.data.type;
  }

  get fullName() {
    return this.name;
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

  get epData() {
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

  matchRegexp(regex: RegExp) {
    return [this.fullName, this.fullType, localize(this.type)].some((text) =>
      regex.test(text),
    );
  }

  get messageHeader(): MessageHeaderData {
    return {
      heading: this.name,
      subheadings: this.fullType,
      img: this.nonDefaultImg,
      description: this.description,
    };
  }

  onDelete() {}
}
