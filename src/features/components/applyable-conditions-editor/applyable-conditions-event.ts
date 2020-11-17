import type { ApplyableConditions } from "@src/features/conditions";

export class ApplyableConditionsEvent extends Event {
   static get is() {
    return "applyable-conditions-updatae" as const;
  }

   constructor(public readonly changed: Partial<ApplyableConditions>) {
     super(ApplyableConditionsEvent.is, { bubbles: true, composed: true });
    
  }
}

declare global {
  interface HTMLElementEventMap {
    "applyable-conditions-updatae": ApplyableConditionsEvent;
  }
}