import { customElement, LitElement, property, html } from "lit-element";
import styles from "./message-area-effect.scss";

@customElement("message-area-effect")
export class MessageAreaEffect extends LitElement {
  static get is() {
    return "message-area-effect" as const;
  }

  static get styles() {
     return [styles];
  }

  
}

declare global {
  interface HTMLElementTagNameMap {
    "message-area-effect": MessageAreaEffect;
  }
}
