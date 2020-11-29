import type { Character } from '@src/entities/actor/proxies/character';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './character-view-network-settings.scss';

@customElement('character-view-network-settings')
export class CharacterViewNetworkSettings extends LitElement {
  static get is() {
    return 'character-view-network-settings' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  render() {
    return html`
      <character-view-drawer-heading
        >${localize('network')}
        ${localize('settings')}</character-view-drawer-heading
      >
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-network-settings': CharacterViewNetworkSettings;
  }
}
