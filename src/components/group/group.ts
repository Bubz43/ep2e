import { customElement, LitElement, property, html } from 'lit-element';
import styles from './group.scss';

@customElement('sl-group')
export class Group extends LitElement {
  static get is() {
    return 'sl-group' as const;
  }

  static styles = [styles];

  @property({ type: String }) label = '';

  render() {
    return html`
      <span class="label">${this.label}:</span>
      <span class="value"><slot></slot></span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-group': Group;
  }
}
