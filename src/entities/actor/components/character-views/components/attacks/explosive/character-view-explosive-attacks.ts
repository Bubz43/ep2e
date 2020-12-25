import type { Character } from "@src/entities/actor/proxies/character";
import type { Explosive } from "@src/entities/item/proxies/explosive";
import { customElement, LitElement, property, html } from "lit-element";
import styles from "./character-view-explosive-attacks.scss";

@customElement("character-view-explosive-attacks")
export class CharacterViewExplosiveAttacks extends LitElement {
  static get is() {
    return "character-view-explosive-attacks" as const;
  }

  static get styles() {
     return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) explosive!: Explosive;

  @property({ attribute: false }) token?: Token | null;

}
declare global {
  interface HTMLElementTagNameMap {
    "character-view-explosive-attacks": CharacterViewExplosiveAttacks;
  }
}
