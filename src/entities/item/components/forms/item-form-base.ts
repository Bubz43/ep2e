import { FormDrawer } from '@src/entities/components/form-layout/entity-form-drawer-mixin';
import { LitElement } from 'lit-element';
import type { ItemProxy } from '../../item';

export abstract class ItemFormBase extends FormDrawer(LitElement) {
  declare abstract item: ItemProxy;

  get disabled() {
    return !this.item.editable;
  }
}
