import { startRangedAttack } from '@src/combat/attack-init';
import type { AttackType } from '@src/combat/attacks';
import type { SeekerWeapon } from '@src/entities/item/proxies/seeker-weapon';
import { subscribeToEnvironmentChange } from '@src/features/environment';
import { createFiringModeGroup } from '@src/features/firing-modes';
import { localize } from '@src/foundry/localization';
import { getWeaponRange } from '@src/success-test/range-modifiers';
import { toggle } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { map } from 'remeda';
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

  private environmentUnsub: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.environmentUnsub = subscribeToEnvironmentChange(() =>
      this.requestUpdate(),
    );
  }

  disconnectedCallback() {
    this.environmentUnsub?.();
    this.environmentUnsub = null;
    super.disconnectedCallback();
  }

  private openMissileSelect(ev: MouseEvent) {
    const { character } = requestCharacter(this);
    character && openSeekerAmmoMenu(ev, character, this.weapon);
  }

  private fire = (attackType: AttackType) => {
    const attack = this.weapon.missiles?.attacks[attackType];
    const { character, token } = requestCharacter(this);

    if (!attack || !character) return;
    startRangedAttack({
      actor: character.actor,
      firingModeGroup: createFiringModeGroup(this.weapon.firingMode),
      token,
      weaponId: this.weapon.id,
      adjacentElement: this,
      attackType,
    });
  };

  private toggleBraced() {
    this.weapon.updater.path('data', 'state', 'braced').commit(toggle);
  }

  render() {
    const {
      missiles,
      editable,
      gearTraits,
      firingMode,
      activeAmmoSettings,
      acceptableMissileSizes,
      weaponTraits,
      accessories,
    } = this.weapon;
    // TODO: Range Tooltip
    return html`
      <colored-tag type="info"
        >${localize('range')}
        <span slot="after">${getWeaponRange(this.weapon)}</span></colored-tag
      >
      <colored-tag type="info">${localize(firingMode)}</colored-tag>

      ${this.weapon.isFixed
        ? html`
            <colored-tag
              type="usable"
              @click=${this.toggleBraced}
              ?disabled=${!editable}
              >${localize(
                this.weapon.braced ? 'braced' : 'carried',
              )}</colored-tag
            >
          `
        : ''}

      <colored-tag
        clickable
        ?disabled=${!editable}
        type="usable"
        @click=${this.openMissileSelect}
      >
        ${missiles
          ? html`
              <span
                >${missiles.fullName.trimEnd()},
                <sl-group label=${localize('capacity')}
                  >${activeAmmoSettings.missileCapacity}</sl-group
                ></span
              >
              <span slot="after">${missiles.fullType}</span>
            `
          : html`
              <span>${localize('load')}</span>
              <span slot="after"
                >${map(acceptableMissileSizes, localize).join('/')}
                ${localize('missiles')}</span
              >
            `}
      </colored-tag>

      ${missiles
        ? html`<character-view-explosive-attacks
            .explosive=${missiles}
            .onAttack=${this.fire}
          ></character-view-explosive-attacks>`
        : ''}
      ${[...gearTraits, ...weaponTraits, ...accessories].map(
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
