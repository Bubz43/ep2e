import type { Character } from "@src/entities/actor/proxies/character";
import type { Sleeve } from "@src/entities/actor/sleeves";
import { customElement, LitElement, property, html } from "lit-element";
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
    return html``
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "character-view-sleeve": CharacterViewSleeve;
  }
}
