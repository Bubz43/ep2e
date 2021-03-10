import { ItemType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import type { ThrownWeapon } from '@src/entities/item/proxies/thrown-weapon';
import { customElement, html, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { requestCharacter } from '../../../character-request-event';
import { openCoatingMenu } from '../../attacks/melee-weapon-menus';
import { renderItemAttacks } from '../../attacks/render-item-attacks';
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

  @property({ attribute: false }) item!: MeleeWeapon | ThrownWeapon;

  private toggleEquipped() {
    this.item.type === ItemType.ThrownWeapon
      ? this.item.toggleStashed()
      : this.item.toggleEquipped();
  }

  private openCoatingSelectMenu(ev: MouseEvent) {
    const { character } = requestCharacter(this);

    character && openCoatingMenu(ev, character, this.item);
  }

  private get equipped() {
    return this.item.type === ItemType.ThrownWeapon
      ? !this.item.stashed
      : this.item.equipped;
  }

  renderHeaderButtons() {
    const { item, equipped } = this;
    const { attacks } = item;
    return html`
      ${equipped
        ? html`
            <mwc-icon-button
              class="toggle ${classMap({ activated: !!item.coating })}"
              icon="colorize"
              @click=${this.openCoatingSelectMenu}
              ?disabled=${!item.editable ||
              (this.item.type === ItemType.ThrownWeapon && !this.item.quantity)}
            ></mwc-icon-button>
          `
        : html`
            <mwc-icon-button
              @click=${this.toggleEquipped}
              icon=${equipped ? 'archive' : 'unarchive'}
              ?disabled=${!item.editable}
            ></mwc-icon-button>
          `}
    `;
  }

  renderExpandedContent() {
    return html` ${renderItemAttacks(this.item)} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'weapon-card': WeaponCard;
  }
}
