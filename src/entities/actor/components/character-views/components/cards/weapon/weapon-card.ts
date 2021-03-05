import { startMeleeAttack } from '@src/combat/attack-init';
import type { AttackType } from '@src/combat/attacks';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { customElement, html, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { requestCharacter } from '../../../character-request-event';
import { openMeleeCoatingMenu } from '../../attacks/melee-weapon-menus';
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

  @property({ attribute: false }) item!: MeleeWeapon;

  private toggleEquipped() {
    this.item.toggleEquipped();
  }

  private startAttackTest(attackType: AttackType) {
    const { token, character } = requestCharacter(this);
    if (!character) return; // TODO maybe throw error
    startMeleeAttack({
      actor: character.actor,
      token,
      attackType,
      weaponId: this.item.id,
    });
  }

  private openCoatingSelectMenu(ev: MouseEvent) {
    const { character } = requestCharacter(this);

    character && openMeleeCoatingMenu(ev, character, this.item);
  }

  renderHeaderButtons() {
    const { item } = this;
    const { attacks } = item;
    return html`
      ${item.equipped
        ? html`
            <mwc-icon-button
              class="toggle ${classMap({ activated: !!item.coating })}"
              icon="colorize"
              @click=${this.openCoatingSelectMenu}
              ?disabled=${!item.editable}
            ></mwc-icon-button>
          `
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
    return html` ${renderItemAttacks(this.item)} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'weapon-card': WeaponCard;
  }
}
