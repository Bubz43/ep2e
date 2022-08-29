import type { ItemType } from '@src/entities/entity-types';
import { UpdateStore } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import { deepMerge, toTuple } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { createPipe, equals, omit } from 'remeda';
import { Copyable, Purchasable, Stackable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';
import { Substance } from './substance';

class Base extends ItemProxyBase<ItemType.FirearmAmmo> {
  get updateState() {
    return this.updater.path('system', 'state');
  }
  get updateQuantity() {
    return this.updater.path('system');
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

  get fullName() {
    return `${this.name} (${this.quantity}) ${
      this.canCarryPayload ? `[${this.payload?.name || localize('empty')}]` : ''
    }`;
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

  get defaultMode() {
    const [mode] = this.modes;
    if (!mode) throw new Error('Firearm Ammo must have at least one mode');
    return mode;
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
    return this.updater.path('flags', EP.Name, 'payload').commit;
  }

  private static readonly commonGetters: ReadonlyArray<keyof FirearmAmmo> = [
    'name',
    'quality',
    'description',
    'cost',
    'isBlueprint',
    'ammoClass',
    'modes',
    'canCarryPayload',
  ];

  isSameAs(ammo: FirearmAmmo) {
    return (
      FirearmAmmo.commonGetters.every((prop) =>
        equals(this[prop], ammo[prop]),
      ) &&
      equals(
        omit(this.epData, ['blueprint', 'quantity', 'state']),
        omit(ammo.epData, ['blueprint', 'quantity', 'state']),
      ) &&
      equals(this.epFlags, ammo.epFlags)
    );
  }
}
