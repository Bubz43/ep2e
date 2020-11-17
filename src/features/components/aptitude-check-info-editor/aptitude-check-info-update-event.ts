import type { AptitudeCheckInfo } from '@src/features/aptitude-check-result-info';

export class AptitudeCheckInfoUpdateEvent extends Event {
  static get is() {
    return 'aptitude-check-info-update' as const;
  }

  constructor(public readonly changed: Partial<AptitudeCheckInfo>) {
    super(AptitudeCheckInfoUpdateEvent.is, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    'aptitude-check-info-update': AptitudeCheckInfoUpdateEvent;
  }
}
