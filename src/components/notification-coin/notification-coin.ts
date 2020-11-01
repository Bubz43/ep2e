import { customElement, LitElement, property, html } from 'lit-element';
import styles from './notification-coin.scss';

@customElement('notification-coin')
export class NotificationCoin extends LitElement {
  static get is() {
    return 'notification-coin' as const;
  }

  static styles = [styles];

  @property({ type: Number }) value = 0;

  @property({ type: Boolean, reflect: true }) actionRequired = false;

  render() {
    return html`
      <div class="coin">
        <span class="value">${this.value}</span>
        <span class="attention">!</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'notification-coin': NotificationCoin;
  }
}
