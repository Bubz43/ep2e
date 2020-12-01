export class UsedRollPartsEvent extends Event {
  static get is() {
    return 'used-roll-parts' as const;
  }

  constructor(public readonly usedRollParts: ReadonlySet<number>) {
    super(UsedRollPartsEvent.is, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    'used-roll-parts': UsedRollPartsEvent;
  }
}
