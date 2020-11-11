import { customElement, LitElement, property, html } from 'lit-element';
import styles from './form-reputation-item.scss';

@customElement('form-reputation-item')
export class FormReputationItem extends LitElement {
  static get is() {
    return 'form-reputation-item' as const;
  }

  static styles = [styles];
}

declare global {
  interface HTMLElementTagNameMap {
    'form-reputation-item': FormReputationItem;
  }
}
