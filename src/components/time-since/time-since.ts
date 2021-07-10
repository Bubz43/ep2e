import { toMilliseconds } from '@src/features/modify-milliseconds';
import { customElement, html, LitElement, property } from 'lit-element';

@customElement('time-since')
export class TimeSince extends LitElement {
  static get is() {
    return 'time-since' as const;
  }

  @property({ type: Number }) timestamp!: number;

  private intervalId?: ReturnType<typeof setInterval>;

  connectedCallback() {
    this.intervalId = setInterval(
      () => this.requestUpdate(),
      toMilliseconds({ seconds: 15 }),
    );
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.intervalId ?? clearInterval(this.intervalId);
    super.disconnectedCallback();
  }

  render() {
    return html` ${timeSince(this.timestamp)} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'time-since': TimeSince;
  }
}
