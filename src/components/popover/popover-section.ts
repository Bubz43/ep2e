import { customElement, LitElement, property, html } from 'lit-element';
import styles from './popover-section.scss';

@customElement('sl-popover-section')
export class PopoverSection extends LitElement {
  static get is() {
    return 'sl-popover-section' as const;
  }

  static styles = [styles];

  @property({ type: String }) heading!: string;

  render() {
    return html`
      <header>
        <h4>${this.heading}</h4>
        <slot name="action"></slot>
      </header>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-popover-section': PopoverSection;
  }
}
