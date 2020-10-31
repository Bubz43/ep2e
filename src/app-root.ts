import {
  customElement,
  property,
  LitElement,
  html,
  css,
  unsafeCSS,
} from 'lit-element';
import style from './app.scss';
import { localImage } from './utility/images';



@customElement('app-root')
export class AppRoot extends LitElement {
  @property({ type: String }) message?: string;

  static get styles() {
    return style;
  }

  render() {
    return html`
      <div class="wrapper">
        <h1>LitElement + Snowpack</h1>
        <p>Edit <code>src/app-root.ts</code> and save to reload.</p>
        <sl-button>
        <img height="20px" src=${localImage("images/eclipse.png")} />Test Button</sl-button>
        <mwc-icon-button icon="add"></mwc-icon-button>
        <a
          class="link"
          href="https://lit-element.polymer-project.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${this.message ?? 'some stuff'}
        </a>
      </div>
    `;
  }
}
