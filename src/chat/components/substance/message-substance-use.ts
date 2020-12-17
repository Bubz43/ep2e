import type { SubstanceUseData } from "@src/chat/message-data";
import { customElement, LitElement, property, html } from "lit-element";
import styles from "./message-substance-use.scss";

@customElement("message-substance-use")
export class MessageSubstanceUse extends LitElement {
  static get is() {
    return "message-substance-use" as const;
  }

  static styles = [styles];

  @property({ type: Object }) substanceUse!: SubstanceUseData;

  render() {
    return html`
      
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "message-substance-use": MessageSubstanceUse;
  }
}
