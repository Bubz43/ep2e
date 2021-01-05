import type { MeleeWeapon } from "@src/entities/item/proxies/melee-weapon";
import { customElement, LitElement, property, html } from "lit-element";
import styles from "./character-view-melee-weapon-attacks.scss";

@customElement("character-view-melee-weapon-attacks")
export class CharacterViewMeleeWeaponAttacks extends LitElement {
  static get is() {
    return "character-view-melee-weapon-attacks" as const;
  }

  static get styles() {
     return [styles];
  }

  @property({ attribute: false }) meleeWeapon!: MeleeWeapon;


  private async createMessage() {
    const { payload, coating } = this.meleeWeapon;
    
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "character-view-melee-weapon-attacks": CharacterViewMeleeWeaponAttacks;
  }
}
