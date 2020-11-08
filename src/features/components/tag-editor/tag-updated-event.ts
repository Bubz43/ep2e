import type { Tag } from '@src/features/tags';

export class TagUpdatedEvent extends Event {
  static get is() {
    return 'tag-updated' as const;
  }

  constructor(public readonly tag: Tag) {
    super(TagUpdatedEvent.is, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    'tag-updated': TagUpdatedEvent;
  }
}
