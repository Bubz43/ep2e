import type { StringID } from '@src/features/feature-helpers';
import type { Motivation } from '@src/features/motivations';

export class UpdatedMotivationEvent extends Event {
  static get is() {
    return 'updated-motivation' as const;
  }

  constructor(
    public readonly changed: Partial<Motivation>,
    public readonly id?: string,
  ) {
    super(UpdatedMotivationEvent.is, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    'updated-motivation': UpdatedMotivationEvent;
  }
}
