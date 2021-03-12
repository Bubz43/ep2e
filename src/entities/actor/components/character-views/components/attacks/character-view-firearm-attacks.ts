import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startRangedAttack } from '@src/combat/attack-init';
import type { Firearm } from '@src/entities/item/proxies/firearm';
import {
  createFiringModeGroup,
  FiringMode,
  firingModeCost,
} from '@src/features/firing-modes';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { openMenu } from '@src/open-menu';
import { getWeaponRange } from '@src/success-test/range-modifiers';
import { notEmpty, toggle } from '@src/utility/helpers';
import { css, customElement, html, LitElement, property } from 'lit-element';
import { compact } from 'remeda';
import { requestCharacter } from '../../character-request-event';
import styles from './attack-info-styles.scss';

@customElement('character-view-firearm-attacks')
export class CharacterViewFirearmAttacks extends LitElement {
  static get is() {
    return 'character-view-firearm-attacks' as const;
  }

  static get styles() {
    return [
      styles,
      css`
        .firing-mode {
          flex-grow: 0;
          min-width: 4ch;
        }
        .attack-info {
          flex: 1;
        }
        .firing-modes {
          display: flex;
        }
        .attack {
          width: 100%;
          display: flex;
          flex-flow: row wrap;
          padding: 0.25rem 0.5rem;
        }
        .attack + .attack {
          padding-top: 0;
        }
      `,
    ];
  }

  @property({ attribute: false }) weapon!: Firearm;

  private fire(firingMode: FiringMode) {
    const attack = this.weapon.attacks.primary;
    const { character, token } = requestCharacter(this);

    if (!attack || !character) return;
    startRangedAttack({
      actor: character.actor,
      firingModeGroup: createFiringModeGroup(firingMode),
      token,
      weaponId: this.weapon.id,
      adjacentElement: this,
      attackType: 'primary',
    });
  }

  private reloadAmmo() {
    openMenu({
      content: [
        // TODO Ammo Options
        // {
        //   label: localize('reload'),
        //   icon: html`<mwc-icon>refresh</mwc-icon>`,
        //   disabled: this.weapon.fullyLoaded,
        //   callback: () => {
        //     this.weapon.reload();
        //   },
        // },
      ],
    });
  }

  private toggleBraced() {
    this.weapon.updater.path('data', 'state', 'braced').commit(toggle);
  }

  render() {
    const {
      editable,
      gearTraits,
      weaponTraits,
      accessories,

      ammoState,
    } = this.weapon;
    // TODO Special Ammo
    return html`
      <colored-tag type="info"
        >${localize('range')}
        <span slot="after">${getWeaponRange(this.weapon)}</span>
      </colored-tag>

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
        type="usable"
        clickable
        ?disabled=${!editable}
        @click=${this.reloadAmmo}
      >
        <span>${localize('ammo')}</span>
        <value-status
          slot="after"
          value=${ammoState.value}
          max=${ammoState.max}
        ></value-status>
      </colored-tag>

      ${this.renderAttack()}
      ${[...gearTraits, ...weaponTraits, ...accessories].map(
        (trait) =>
          html`<colored-tag type="info">${localize(trait)}</colored-tag>`,
      )}
    `;
  }

  private renderAttack() {
    const attack = this.weapon.attacks.primary;
    if (!attack) return '';
    const { availableShots, editable } = this.weapon;
    const info = compact([
      notEmpty(attack.rollFormulas) &&
        [
          formatDamageType(attack.damageType),
          joinLabeledFormulas(attack.rollFormulas),
          formatArmorUsed(attack),
        ].join(' '),
      attack.notes,
    ]).join('. ');

    return html`
      <div class="attack">
        <div class="firing-modes">
          ${attack.firingModes.map(
            (mode) => html`
              <colored-tag
                class="firing-mode"
                type="attack"
                ?disabled=${!editable || firingModeCost[mode] > availableShots}
                clickable
                title=${localize(mode)}
                @click=${() => this.fire(mode)}
              >
                ${localize('SHORT', mode)}
              </colored-tag>
            `,
          )}
        </div>
        <colored-tag type="info" class="attack-info">${info} </colored-tag>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-firearm-attacks': CharacterViewFirearmAttacks;
  }
}
