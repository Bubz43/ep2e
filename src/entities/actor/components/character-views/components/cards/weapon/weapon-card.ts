import { startMeleeAttack } from '@src/combat/attack-init';
import type { AttackType } from '@src/combat/attacks';
import { ItemType } from '@src/entities/entity-types';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { customElement, html, property } from 'lit-element';
import { requestCharacter } from '../../../character-request-event';
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

  renderHeaderButtons() {
    const { item } = this;
    const { attacks } = item;
    return html`
      ${item.equipped
        ? ''
        : // html` <button class="coating"></button>
          //     ${(['primary', 'secondary'] as const).map((attackType) => {
          //       const attack = attacks[attackType];
          //       if (!attack) return '';
          //       const label =
          //         attack.label || `${localize(attackType)} ${localize('attack')}`;
          //       return html`
          //         <mwc-icon-button
          //           @click=${() => this.startAttackTest(attackType)}
          //           ?disabled=${!item.editable}
          //           title=${label}
          //           >${label[0]}</mwc-icon-button
          //         >
          //       `;
          //     })}`
          html`
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
