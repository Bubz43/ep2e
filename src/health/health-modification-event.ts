import type { ArmorType } from '@src/features/active-armor';
import type { HealthModification } from './health';

export class HealthModificationEvent extends Event {
  static get is() {
    return 'health-modification' as const;
  }

  constructor(
    public readonly modification: Readonly<HealthModification>,
    public readonly armorReduction?: Map<ArmorType, number>,
  ) {
    super(HealthModificationEvent.is, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    'health-modification': HealthModificationEvent;
  }
}
