import { customElement, LitElement, property, html } from 'lit-element';
import styles from './header.scss';

/**
 * @slot heading
 * @slot action
 * @slot info
 */
@customElement('sl-header')
export class Header extends LitElement {
  static get is() {
    return 'sl-header' as const;
  }

  static styles = [styles];

  @property({ type: String }) heading = '';

  @property({ type: Number }) itemCount?: number;

  @property({ type: Boolean, reflect: true }) hideBorder = false;

  render() {
    return html`
      <h3>
        <span><slot name="heading">${this.heading}</slot></span>
        ${this.itemCount !== undefined
          ? html`<span class="count">${this.itemCount}</span>`
          : ''}
        <slot name="info"></slot>
      </h3>
      <slot name="action"></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-header': Header;
  }
}
