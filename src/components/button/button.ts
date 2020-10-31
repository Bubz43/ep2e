import { customElement, LitElement, html } from 'lit-element';
import style from './button.scss';

@customElement('sl-button')
export class Button extends LitElement {
  static styles = style;

  render() {
    return html` <button><slot></slot></button> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-button': Button;
  }
}
