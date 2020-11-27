import type { ItemType } from '@src/entities/entity-types';
import { UpdateStore } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import { deepMerge, toTuple } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { createPipe } from 'remeda';
import { Copyable, Purchasable, Stackable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Substance } from './substance';

class Base extends ItemProxyBase<ItemType.FirearmAmmo> {
  get updateState() {
    return this.updater.prop('data', 'state');
  }
  get updateQuantity() {
    return this.updater.prop("data")
  }
}

export class FirearmAmmo extends mix(Base).with(
  Purchasable,
  Copyable,
  Stackable,
) {
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

  findMode(index: number) {
    const mode = this.modes[index];
    return mode as typeof mode | undefined;
  }

  get canCarryPayload() {
    return this.epData.carryPayload;
  }

  @LazyGetter()
  get payload() {
    const explosive = this.epFlags?.payload?.[0];
    return explosive
      ? new Substance({
          data: explosive,
          embedded: this.name,
          loaded: true,
          updater: new UpdateStore({
            getData: () => explosive,
            isEditable: () => this.editable,
            setData: createPipe(
              deepMerge(explosive),
              toTuple,
              this.updatePayload,
            ),
          }),
          deleteSelf: () => this.removePayload(),
        })
      : null;
  }

  setPayload(payload: Substance) {
    return this.updatePayload([payload.getDataCopy()]);
  }

  removePayload() {
    return this.updatePayload(null);
  }

  private get updatePayload() {
    return this.updater.prop('flags', EP.Name, 'payload').commit;
  }
}
