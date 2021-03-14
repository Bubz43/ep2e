import type { SprayWeapon } from '@src/entities/item/proxies/spray-weapon';
import { customElement, LitElement, property } from 'lit-element';
import styles from './attack-info-styles.scss';

@customElement('character-view-spray-attacks')
export class CharacterViewSprayAttacks extends LitElement {
  static get is() {
    return 'character-view-spray-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) weapon!: SprayWeapon;
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-spray-attacks': CharacterViewSprayAttacks;
  }
}
