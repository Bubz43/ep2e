import type { ItemEntity } from "@src/entities/models";
import type { SetRequired } from "type-fest";

export class ItemDataEvent extends Event {
   static get is() {
    return "item-data" as const;
  }

   constructor(public readonly itemInit: {
    data: SetRequired<Partial<ItemEntity>, "name" | "type">,
    options: { renderSheet: boolean }
  }) {
     super(ItemDataEvent.is, { bubbles: true, composed: true });
    
  }
}

declare global {
  interface HTMLElementEventMap {
    "item-data": ItemDataEvent;
  }
}