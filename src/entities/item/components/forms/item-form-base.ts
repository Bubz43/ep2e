import { FormDrawer } from '@src/entities/components/form-layout/entity-form-drawer-mixin';
import { html, LitElement, PropertyValues } from 'lit-element';
import type { ItemProxy } from '../../item';
import type { EditorWrapper } from '@src/components/editor-wrapper/editor-wrapper';

export abstract class ItemFormBase extends FormDrawer(LitElement) {
  declare abstract item: ItemProxy;

  get disabled() {
    return !this.item.editable;
  }

  abstract get descriptionUpdateActions(): EditorWrapper['updateActions']

  private editorWrapper?: EditorWrapper;

  update(changedProps: PropertyValues<this>) {
    if (!this.editorWrapper) {
      this.editorWrapper = document.createElement("editor-wrapper");
      this.editorWrapper.slot = "description"
      this.append(this.editorWrapper)
    }
    this.editorWrapper.disabled = this.disabled;
    this.editorWrapper.updateActions = this.descriptionUpdateActions
    super.update(changedProps);
  }

  renderDescriptionSlot() {
    return html`<slot name="description" slot="description"></slot>`
  }
}
