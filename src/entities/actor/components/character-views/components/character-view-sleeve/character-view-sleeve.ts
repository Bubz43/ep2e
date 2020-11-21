import type { Character } from "@src/entities/actor/proxies/character";
import type { Sleeve } from "@src/entities/actor/sleeves";
import { localize } from "@src/foundry/localization";
import { customElement, LitElement, property, html } from "lit-element";
import { compact } from "remeda";
import styles from "./character-view-sleeve.scss";

@customElement("character-view-sleeve")
export class CharacterViewSleeve extends LitElement {
  static get is() {
    return "character-view-sleeve" as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) sleeve!: Sleeve;

  render() {
    const { sleeve } = this;
    return html`
    <header>
        <button @click=${this.sleeve.openForm}>
          <span class="name">${this.sleeve.name}</span>
          <span class="details">
          ${compact([
              "size" in sleeve && localize(sleeve.size),
              sleeve.subtype || localize(sleeve.type),
              "isSwarm" in sleeve && sleeve.isSwarm && localize("swarm"),
              "sex" in sleeve && sleeve.sex,
            ]).join(" • ")}</span
          >
        </button>
      </header>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "character-view-sleeve": CharacterViewSleeve;
  }
}
