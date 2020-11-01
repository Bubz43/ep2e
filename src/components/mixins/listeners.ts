import type { LitElement } from "lit-element";
import type { Class } from "type-fest";
import {
  EventListenerSubscription,
  removeListeners,
} from "weightless/util/event";

export const ListenerSubscription = (Base: Class<LitElement>) => {
  return class ListenerSubscription extends Base {
    private listenerSubs: EventListenerSubscription[] = [];

    disconnectedCallback() {
      this.clearListenerSubs();
      super.disconnectedCallback();
    }

    protected addListenerSubs(
      ...listenerSubscriptions: EventListenerSubscription[]
    ) {
      this.listenerSubs.push(...listenerSubscriptions);
      return this;
    }

    protected clearListenerSubs() {
      removeListeners(this.listenerSubs);
      this.listenerSubs = [];
      return this;
    }
  };
};
