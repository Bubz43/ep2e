import type { Effect } from "@src/features/effects";

export class EffectUpdatedEvent extends Event {
   static get is() {
    return "effect-updated" as const;
  }

   constructor(public readonly effect: Effect) {
     super(EffectUpdatedEvent.is, { bubbles: true, composed: true });
    
  }
}

declare global {
  interface HTMLElementEventMap {
    "effect-updated": EffectUpdatedEvent;
  }
}