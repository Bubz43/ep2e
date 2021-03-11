import type { BeamWeapon } from '@src/entities/item/proxies/beam-weapon';
import { customElement, LitElement, property } from 'lit-element';
import styles from './attack-info-styles.scss';

@customElement('character-view-beam-attacks')
export class CharacterViewBeamAttacks extends LitElement {
  static get is() {
    return 'character-view-beam-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) weapon!: BeamWeapon;
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-beam-attacks': CharacterViewBeamAttacks;
  }
}
