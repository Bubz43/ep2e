import type { Character } from '@src/entities/actor/proxies/character';
import type { Substance } from '@src/entities/item/proxies/substance';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './character-view-active-substance.scss';

@customElement('character-view-active-substance')
export class CharacterViewActiveSubstance extends LitElement {
  static get is() {
    return 'character-view-active-substance' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) substance!: Substance;

  render() {
    const { disabled } = this.character;
    const { substance } = this;
    const { timeState } = substance.appliedInfo;
    return html`
      <character-view-time-item
        ?disabled=${disabled}
        .timeState=${timeState}
        completion="expired"
        .item=${substance}
      >
      </character-view-time-item>
      <sl-animated-list class="active-substance-actions">
        ${!timeState.remaining ? html`
        
        ` : ""}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-active-substance': CharacterViewActiveSubstance;
  }
}
