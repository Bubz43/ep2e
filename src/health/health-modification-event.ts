import type { HealthModification } from './health';

export class HealthModificationEvent extends Event {
  static get is() {
    return 'health-modification' as const;
  }

  constructor(public readonly modification: Readonly<HealthModification>) {
    super(HealthModificationEvent.is, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    'health-modification': HealthModificationEvent;
  }
}
