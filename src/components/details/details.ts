import { clickIfEnter } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import mix from 'mix-with/lib';
import { LazyRipple } from '../mixins/lazy-ripple';
import styles from './details.scss';

@customElement('sl-details')
export class Details extends mix(LitElement).with(LazyRipple) {
  static get is() {
    return 'sl-details' as const;
  }

  static styles = [styles];

  @property({ type: Boolean, reflect: true }) open = false;

  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ type: Boolean, reflect: true }) endArrow = false;

  @property({ type: String }) summary = '';

  toggleOpen() {
    if (this.disabled) return;
    this.open = !this.open;
  }

  render() {
    return html`
      <div
        class="toggle"
        @click=${this.toggleOpen}
        @focus="${this.handleRippleFocus}"
        @blur="${this.handleRippleBlur}"
        @mousedown="${this.handleRippleMouseDown}"
        @mouseenter="${this.handleRippleMouseEnter}"
        @mouseleave="${this.handleRippleMouseLeave}"
        @keydown=${clickIfEnter}
        tabindex=${this.disabled ? '-1' : '0'}
      >
        <mwc-icon class="icon">${this.endArrow ? "arrow_left" : "arrow_right"}</mwc-icon>
        <div class="full-summary">
          <div class="summary"><slot name="summary">${this.summary}</slot></div>
          <div class="info"><slot name="info"></slot></div>
        </div>
        ${this.renderRipple(this.disabled)}
      </div>

      <div class="content" ?hidden=${!this.open}><slot></slot></div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-details': Details;
  }
}
