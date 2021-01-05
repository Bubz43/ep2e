import type { MeleeWeaponMessageData } from "@src/chat/message-data";
import { MeleeWeapon } from "@src/entities/item/proxies/melee-weapon";
import { customElement, LitElement, property, html } from "lit-element";
import { MessageElement } from "../message-element";
import styles from "./message-melee-attack.scss";

@customElement("message-melee-attack")
export class MessageMeleeAttack extends MessageElement {
  static get is() {
    return "message-melee-attack" as const;
  }

  static get styles() {
     return [styles];
  }

  @property({ type: Object }) meleeAttack!: MeleeWeaponMessageData;

  get weapon() {
    return new MeleeWeapon({
      data: this.meleeAttack.weapon,
      embedded: null
    })
  }

  render() {
    const { attacks, coating, payload } = this.weapon;
    return html`
      
    `;
  }

}

declare global {
  interface HTMLElementTagNameMap {
    "message-melee-attack": MessageMeleeAttack;
  }
}
