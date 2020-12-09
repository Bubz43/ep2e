import type { HealthChangeMessageData } from "@src/chat/message-data";
import { localize } from "@src/foundry/localization";
import { customElement, LitElement, property, html } from "lit-element";
import { MessageElement } from "../message-element";
import styles from "./message-health-change.scss";

@customElement("message-health-change")
export class MessageHealthChange extends MessageElement {
  static get is() {
    return "message-health-change" as const;
  }

  static styles = [styles];

  @property({ type: Object }) healthChange!: HealthChangeMessageData;

  render() {
    return html`
      <span>${localize(this.healthChange.mode)}</span>
      <span>${localize("damage")} ${this.healthChange.damage}</span>
      <span>${localize("wounds")} ${this.healthChange.wounds}</span>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "message-health-change": MessageHealthChange;
  }
}
