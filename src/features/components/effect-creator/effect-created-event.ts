import type { Effect } from '@src/features/effects';

export class EffectCreatedEvent extends Event {
  static get is() {
    return 'effect-created' as const;
  }

  constructor(public readonly effect: Effect) {
    super(EffectCreatedEvent.is, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    'effect-created': EffectCreatedEvent;
  }
}
