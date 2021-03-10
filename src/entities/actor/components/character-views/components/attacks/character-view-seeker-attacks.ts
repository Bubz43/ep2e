import type { SeekerWeapon } from '@src/entities/item/proxies/seeker-weapon';
import { localize } from '@src/foundry/localization';
import { customElement, html, LitElement, property } from 'lit-element';
import { requestCharacter } from '../../character-request-event';
import { openSeekerAmmoMenu } from './ammo-menus';
import styles from './attack-info-styles.scss';

@customElement('character-view-seeker-attacks')
export class CharacterViewSeekerAttacks extends LitElement {
  static get is() {
    return 'character-view-seeker-attacks' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) weapon!: SeekerWeapon;

  private openMissileSelect(ev: MouseEvent) {
    const { character } = requestCharacter(this);
    character && openSeekerAmmoMenu(ev, character, this.weapon);
  }

  render() {
    const { missiles, editable, gearTraits } = this.weapon;
    return html`
      <colored-tag
        clickable
        ?disabled=${!editable}
        @click=${this.openMissileSelect}
      >
        <span>${localize('missiles')}</span>
        <span slot="after">${missiles?.fullName || '-'}</span>
      </colored-tag>

      ${gearTraits.map(
        (trait) =>
          html`<colored-tag type="info">${localize(trait)}</colored-tag>`,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-seeker-attacks': CharacterViewSeekerAttacks;
  }
}
