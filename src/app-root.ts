import { customElement, property, LitElement, html, css, unsafeCSS } from 'lit-element';
import style from "./app.scss"
const thing = (num: number) => css`${num}vh`;

@customElement('app-root')
export class AppRoot extends LitElement {
  @property({ type: String }) message?: string;

  static get styles() {
    return style;
    return css`
    :host {
      z-index: 1000;
    }
      h1 {
        font-size: 4rem;
      }
      .wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        flex-direction: column;
        height: ${thing(35)};
        background-color: #2196f3;
        background: linear-gradient(315deg, #b4d2ea 0%, #2196f3 100%);
        font-size: 24px;
      }
      .link {
        color: white;
      }
    `;
  }

  render() {
    return html`
      <div class="wrapper">
        <h1>LitElement + Snowpack</h1>
        <p>Edit <code>src/app-root.ts</code> and save to reload.</p>
        <sl-button>Test Button</sl-button>
        <a
          class="link"
          href="https://lit-element.polymer-project.org/"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${this.message ?? "some stuff"}
        </a>
      </div>
    `;
  }
}
