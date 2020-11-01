import { customElement, LitElement, property, html } from 'lit-element';
import styles from './section.scss';

@customElement('sl-section')
export class Section extends LitElement {
  static get is() {
    return 'sl-section' as const;
  }

  static styles = [styles];

  @property({ type: String }) heading = '';

  @property({ type: Boolean, reflect: true }) flipped = false;

  render() {
    return html`
      <header>
        <slot name="control"></slot>
        <h2>${this.heading}</h2>
      </header>
      <div class="content">
        <slot></slot>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-section': Section;
  }
}
