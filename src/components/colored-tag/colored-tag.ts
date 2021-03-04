import { customElement, html, LitElement, property } from 'lit-element';
import styles from './colored-tag.scss';

/**
 * @slot -
 * @slot after
 */
@customElement('colored-tag')
export class ColoredTag extends LitElement {
  static get is() {
    return 'colored-tag' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: String }) type: 'usable' | 'attack' | 'info' = 'info';

  @property({ type: Boolean }) clickable = false;

  @property({ type: Boolean }) disabled = false;

  render() {
    return html`
      <wl-list-item
        class=${this.type}
        ?clickable=${this.clickable}
        ?disabled=${this.disabled}
      >
        <slot></slot>
        <slot slot="after" name="after"></slot>
      </wl-list-item>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'colored-tag': ColoredTag;
  }
}
