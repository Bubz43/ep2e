import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startRangedAttack } from '@src/combat/attack-init';
import { SprayPayload } from '@src/data-enums';
import type { SprayWeapon } from '@src/entities/item/proxies/spray-weapon';
import { subscribeToEnvironmentChange } from '@src/features/environment';
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
import { compact, map } from 'remeda';
import { requestCharacter } from '../../character-request-event';
import { openSprayWeaponPayloadMenu } from './ammo-menus';
import styles from './attack-info-styles.scss';

@customElement('character-view-spray-attacks')
export class CharacterViewSprayAttacks extends LitElement {
  static get is() {
    return 'character-view-spray-attacks' as const;
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

  @property({ attribute: false }) weapon!: SprayWeapon;

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

  private toggleBraced() {
    this.weapon.updater.path('system', 'state', 'braced').commit(toggle);
  }

  private openAmmoMenu(ev: MouseEvent) {
    const { character } = requestCharacter(this);
    if (this.weapon.payloadUse === SprayPayload.FirePayload) {
      character && openSprayWeaponPayloadMenu(ev, character, this.weapon);
    } else {
      openMenu({
        position: ev,
        content: [
          {
            label: localize('reload'),
            disabled: this.weapon.ammoState.max === this.weapon.ammoState.value,
            callback: () => this.weapon.reloadStandardAmmo(),
          },
        ],
      });
    }
  }

  render() {
    const {
      editable,
      gearTraits,
      weaponTraits,
      accessories,
      ammoState,
      payloadUse,
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
              clickable
              >${localize(
                this.weapon.braced ? 'braced' : 'carried',
              )}</colored-tag
            >
          `
        : ''}
      ${payloadUse === SprayPayload.CoatAmmunition && this.weapon.payload
        ? html`
            <colored-tag type="info">
              ${localize('ammoCoating')}
              <span slot="after">${this.weapon.payload.fullName}</span>
            </colored-tag>
          `
        : ''}

      <colored-tag
        type="usable"
        clickable
        ?disabled=${!editable}
        @click=${this.openAmmoMenu}
      >
        <span
          >${this.weapon.firePayload
            ? this.weapon.payload?.fullName ||
              `${localize('no')} ${localize('payload')}`
            : localize('ammo')}
        </span>
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
      notEmpty(attack.attackTraits) &&
        map(attack.attackTraits, localize).join(', '),
      attack.notes,
      attack.superiorSuccessDot &&
        `${attack.superiorSuccessDot} ${localize('damageOverTime')} ${localize(
          'on',
        )} ${localize('superiorSuccess')}`,
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
    'character-view-spray-attacks': CharacterViewSprayAttacks;
  }
}
