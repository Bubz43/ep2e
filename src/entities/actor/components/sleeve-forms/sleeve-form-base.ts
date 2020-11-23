import type { ActorProxy, MaybeToken } from '@src/entities/actor/actor';
import type { ItemProxy } from '@src/entities/item/item';
import { setDragDrop, DropType } from '@src/foundry/drag-and-drop';
import { LitElement, property } from 'lit-element';
import { FormDrawer } from '../../../components/form-layout/entity-form-drawer-mixin';

export abstract class SleeveFormBase extends FormDrawer(LitElement) {
  declare abstract sleeve: ActorProxy;

  protected itemDragStart = (ev: DragEvent, item: ItemProxy) => {
    const { actor } = this.sleeve;
    setDragDrop(ev, {
      ...actor.identifiers,
      type: DropType.Item,
      data: item.data,
    });
  };
}
