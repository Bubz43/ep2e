import { customElement, LitElement, property, html } from 'lit-element';
import styles from './entity-form-sidebar-divider.scss';

@customElement('entity-form-sidebar-divider')
export class EntityFormSidebarDivider extends LitElement {
  static get is() {
    return 'entity-form-sidebar-divider' as const;
  }

  static styles = [styles];

  @property({ type: String }) label = '';

  render() {
    return html` ${this.label ? html`<span>${this.label}</span>` : ''} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'entity-form-sidebar-divider': EntityFormSidebarDivider;
  }
}
