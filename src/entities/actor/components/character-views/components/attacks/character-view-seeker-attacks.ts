import { customElement, LitElement } from 'lit-element';
import styles from './attack-info-styles.scss';

@customElement('character-view-seeker-attacks')
export class CharacterViewSeekerAttacks extends LitElement {
  static get is() {
    return 'character-view-seeker-attacks' as const;
  }

  static get styles() {
    return [styles];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-seeker-attacks': CharacterViewSeekerAttacks;
  }
}
