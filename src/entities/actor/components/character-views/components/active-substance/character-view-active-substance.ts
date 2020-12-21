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
      <div class="active-substance-actions">
        <mwc-button dense unelevated>thing1</mwc-button>
        <mwc-button
          style="--mdc-theme-primary: var(--color-negative)"
          dense
          unelevated
          >thing2</mwc-button
        >
        <mwc-button dense unelevated>thing3</mwc-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-active-substance': CharacterViewActiveSubstance;
  }
}
