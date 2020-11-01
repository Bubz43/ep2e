import { customElement, LitElement, property, html } from 'lit-element';
import styles from './header.scss';

@customElement('sl-header')
export class Header extends LitElement {
  static get is() {
    return 'sl-header' as const;
  }

  static styles = [styles];

  @property({ type: String }) heading = '';

  @property({ type: Number }) itemCount?: number;

  render() {
    return html`
      <h3>
        ${this.heading}
        ${typeof this.itemCount === 'number'
          ? html`<span class="count">${this.itemCount}</span>`
          : ''}
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
