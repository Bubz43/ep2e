import type { Trait } from "@src/entities/item/proxies/trait";
import type { StringID } from "@src/features/feature-helpers";

export class UpdatedTraitLevelEvent extends Event {
   static get is() {
    return "updated-trait-level" as const;
  }

   constructor(public readonly level: StringID<Trait["levelInfo"]>) {
     super(UpdatedTraitLevelEvent.is, { bubbles: true, composed: true });
    
  }
}

declare global {
  interface HTMLElementEventMap {
    "updated-trait-level": UpdatedTraitLevelEvent;
  }
}