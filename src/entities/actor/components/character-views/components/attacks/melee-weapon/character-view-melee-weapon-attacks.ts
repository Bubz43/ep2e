import { createMessage } from '@src/chat/create-message';
import { formatArmorUsed } from '@src/combat/attack-formatting';
import type { AttackType, MeleeWeaponAttack } from '@src/combat/attacks';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { compact, map } from 'remeda';
import { requestCharacter } from '../../../character-request-event';
import styles from './character-view-melee-weapon-attacks.scss';

@customElement('character-view-melee-weapon-attacks')
export class CharacterViewMeleeWeaponAttacks extends LitElement {
  static get is() {
    return 'character-view-melee-weapon-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) weapon!: MeleeWeapon;

  private async createMessage(attackType: AttackType) {    
    const { token, character } = requestCharacter(this);

    createMessage({
      data: {
        header: this.weapon.messageHeader,
        meleeAttack: { weapon: this.weapon.getDataCopy(), attackType },
      },
      entity: token || character,
    });
  }

  render() {
    const { attacks, coating, payload } = this.weapon;
    return html`
      <div class="shared">
        ${coating
          ? html`<sl-group label=${localize('coating')}
              >${coating.name}</sl-group
            >`
          : ''}
        ${payload
          ? html`<sl-group label=${localize('payload')}
              >${payload.name}</sl-group
            >`
          : ''}
      </div>
      <ul class="attacks">
        ${this.renderAttack(attacks.primary, 'primary')}
        ${attacks.secondary
          ? this.renderAttack(attacks.secondary, 'secondary')
          : ''}
      </ul>
    `;
  }

  private renderAttack(attack: MeleeWeaponAttack, type: AttackType) {
    const info = compact([
      notEmpty(attack.rollFormulas) &&
        [
          formatDamageType(attack.damageType),
          joinLabeledFormulas(attack.rollFormulas),
          formatArmorUsed(attack),
        ].join(' '),
      notEmpty(attack.attackTraits) &&
        map(attack.attackTraits, localize).join(', '),
      attack.notes,
    ]).join('. ');
    if (!this.weapon.hasSecondaryAttack && !info) return '';
    return html`
      <wl-list-item clickable @click=${() => this.createMessage(type)}>
        <div>${this.weapon.hasSecondaryAttack
          ? html` <span class="label">${attack.label}</span> `
          : ''}
        <span> ${info.endsWith('.') ? info : `${info}.`}</span></div>
      </wl-list-item>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-melee-weapon-attacks': CharacterViewMeleeWeaponAttacks;
  }
}
