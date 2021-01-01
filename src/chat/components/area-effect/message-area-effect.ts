import type { MessageAreaEffectData } from "@src/chat/message-data";
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

  @property({ type: Object }) areaEffect!: MessageAreaEffectData;

  render() {
    return html`
      
    `;
  }
  
}

declare global {
  interface HTMLElementTagNameMap {
    "message-area-effect": MessageAreaEffect;
  }
}
