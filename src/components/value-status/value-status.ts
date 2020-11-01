import { customElement, LitElement, property, html } from "lit-element";
import styles from "./value-status.scss";

@customElement("value-status")
export class ValueStatus extends LitElement {
  static get is() {
    return "value-status" as const;
  }

  static styles = [styles];

  @property() value!: string | number;

  @property({ type: Number }) max?: number;

  render() {
    return html`
      ${this.value} ${this.max ? html`<small> / ${this.max} </small>` : ""}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "value-status": ValueStatus;
  }
}
