import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './character-view-ego.scss';

@customElement('character-view-ego')
export class CharacterViewEgo extends LitElement {
  static get is() {
    return 'character-view-ego' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) ego!: Ego;

  render() {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-ego': CharacterViewEgo;
  }
}
