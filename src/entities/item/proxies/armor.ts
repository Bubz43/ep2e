import type { ObtainableEffects } from '@src/entities/applied-effects';
import type { ItemType } from '@src/entities/entity-types';
import { createEffect } from '@src/features/effects';
import { LazyGetter } from 'lazy-get-decorator';
import mix from 'mix-with/lib';
import { Copyable, Equippable, Purchasable } from '../item-mixins';
import { ItemProxyBase, ItemProxyInit } from './item-proxy-base';

class Base extends ItemProxyBase<ItemType.Armor> {
  get updateState() {
    return this.updater.prop('data', 'state');
  }
}
export class Armor
  extends mix(Base).with(Equippable, Purchasable, Copyable)
  implements ObtainableEffects {
  constructor(init: ItemProxyInit<ItemType.Armor>) {
    super(init);
  }

  get effects() {
    return this.epData.effects;
  }

  get layerable() {
    return this.armorState.layerable;
  }

  get hasActiveState() {
    return this.epData.hasActiveState;
  }

  get activated() {
    return (
      this.hasActiveState &&
      !this.isBlueprint &&
      this.embedded &&
      this.equipped &&
      this.epData.state.activated
    );
  }

  get armorValues() {
    return this.epData.armorValues;
  }

  get activeArmor() {
    return this.epData.activeArmor;
  }

  get armorState() {
    return this.activated ? this.activeArmor : this.armorValues;
  }

  get currentArmorValues() {
    const { energy, kinetic } = this.armorState;
    return { energy, kinetic };
  }

  get armorEffect() {
    const { layerable, concealable } = this.armorState;
    return createEffect.armor({
      ...this.currentArmorValues,
      layerable,
      concealable
    });
  }

  @LazyGetter()
  get currentEffects() {
    return {
      source: this.name,
      effects: [...this.effects, this.armorEffect],
    };
  }

  get attackTraits() {
    return this.epData.attackTraits;
  }
}
