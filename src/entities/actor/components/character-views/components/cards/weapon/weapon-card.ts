import type { RangedWeapon } from '@src/entities/item/item';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { customElement, LitElement, property, html } from 'lit-element';
import { ItemCardBase } from '../item-card-base';
import styles from './weapon-card.scss';

@customElement('weapon-card')
export class WeaponCard extends ItemCardBase {
  static get is() {
    return 'weapon-card' as const;
  }

  static get styles() {
    return [...super.styles, styles];
  }

  @property({ attribute: false }) item!: MeleeWeapon | RangedWeapon;

  renderHeaderButtons() {
    const { item } = this;
    return html`
      ${item.equipped
        ? ''
        : html`
            <mwc-icon-button
              @click=${this.toggleEquipped}
              icon=${item.equipped ? 'archive' : 'unarchive'}
              ?disabled=${!item.editable}
            ></mwc-icon-button>
          `}
    `;
  }

  renderExpandedContent() {
    return html`
      ${this.item.type === ItemType.MeleeWeapon
        ? html`
            <character-view-melee-weapon-attacks
              .weapon=${this.item}
            ></character-view-melee-weapon-attacks>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'weapon-card': WeaponCard;
  }
}
