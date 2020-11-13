import type { ItemType } from '@src/entities/entity-types';
import { UpdateStore } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Substance } from './substance';

class Base extends ItemProxyBase<ItemType.FirearmAmmo> {}

export class FirearmAmmo extends mix(Base).with(Purchasable) {
  readonly loaded;
  constructor({
    loaded,
    ...init
  }: ItemProxyInit<ItemType.FirearmAmmo> & { loaded: boolean }) {
    super(init);
    this.loaded = loaded;
  }

  get fullType() {
    return `${localize(this.type)} (${localize(this.ammoClass)})`;
  }

  get ammoClass() {
    return this.epData.ammoClass;
  }

  get hasMultipleModes() {
    return this.modes.length > 1;
  }

  @LazyGetter()
  get modes() {
    return this.epData.modes.map((type, index) => ({
      ...type,
      name: type.name || `${localize('mode')} ${index + 1}`,
    }));
  }

  get canCarryPayload() {
    return this.epData.carryPayload;
  }

  @LazyGetter()
  get payload() {
    const explosive = this.epFlags?.payload;
    return explosive
      ? new Substance({
          data: explosive,
          embedded: this.name,
          loaded: true,
          updater: new UpdateStore({
            getData: () => explosive,
            isEditable: () => this.editable,
            setData: (changed) => {
              this.updater
                .prop('flags', EP.Name, 'payload')
                .commit(mergeObject(explosive, changed, { inplace: false }));
            },
          }),
          deleteSelf: () => this.removePayload(),
        })
      : null;
  }

  setPayload(payload: Substance) {
    this.updater
      .prop('flags', EP.Name, 'payload')
      .commit(payload.getDataCopy());
  }

  removePayload() {
    return this.updater.prop('flags', EP.Name, 'payload').commit(null);
  }
}
