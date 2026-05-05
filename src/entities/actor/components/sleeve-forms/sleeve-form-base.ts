import type { ActorProxy } from '@src/entities/actor/actor';
import type { ItemProxy } from '@src/entities/item/item';
import { setDragDrop, DropType } from '@src/foundry/drag-and-drop';
import { html, LitElement, PropertyValues } from 'lit-element';
import { FormDrawer } from '../../../components/form-layout/entity-form-drawer-mixin';
import type { EditorWrapper } from '@src/components/editor-wrapper/editor-wrapper';

export abstract class SleeveFormBase extends FormDrawer(LitElement) {
  declare abstract sleeve: ActorProxy;

  protected itemDragStart = (ev: DragEvent, item: ItemProxy) => {
    setDragDrop(
      ev,
      item.uuid
        ? {
          type: DropType.Item,
          uuid: item.uuid,
        }
        : {
          type: DropType.Item,
          data: item.data,
        },
    );
  };

  get disabled() {
    return !this.sleeve.editable;
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
