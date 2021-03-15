import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startRangedAttack } from '@src/combat/attack-init';
import { renderSelectField } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { renderFirearmAmmoDetails } from '@src/entities/item/components/forms/firearm-ammo-details';
import type { Firearm } from '@src/entities/item/proxies/firearm';
import type { FirearmAmmo } from '@src/entities/item/proxies/firearm-ammo';
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
import { compact, mapToObj } from 'remeda';
import { requestCharacter } from '../../character-request-event';
import { openFirearmAmmoMenu } from './ammo-menus';
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
        .ammo-modes {
          width: 100%;
          display: flex;
          align-items: center;
          grid-template-columns: auto 1fr auto;
          --mdc-icon-button-size: 2rem;
        }
        .ammo-modes > sl-form {
          display: contents;
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

  private openAmmoMenu(ev: MouseEvent) {
    const { character } = requestCharacter(this);
    character && openFirearmAmmoMenu(ev, character, this.weapon);
  }

  private toggleBraced() {
    this.weapon.updater.path('data', 'state', 'braced').commit(toggle);
  }

  private openAmmoTransformer() {
    const { specialAmmo } = this.weapon;
    if (!specialAmmo?.hasMultipleModes) return;
    openMenu({
      content: html`<div style="padding: 1rem 2rem">
        <firearm-ammo-transformer
          .firearm=${this.weapon}
          .ammo=${specialAmmo}
        ></firearm-ammo-transformer>
      </div>`,
    });
  }

  render() {
    const {
      editable,
      gearTraits,
      weaponTraits,
      accessories,
      specialAmmo,
      ammoState,
      ammoData,
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

      <colored-tag
        type="usable"
        clickable
        ?disabled=${!editable}
        @click=${this.openAmmoMenu}
      >
        <span
          >${specialAmmo?.name || localize('standard')}
          ${localize('ammo')}</span
        >
        <value-status
          slot="after"
          value=${ammoData.value}
          max=${ammoState.max}
        ></value-status>
      </colored-tag>

      ${specialAmmo?.hasMultipleModes
        ? this.renderAmmoProgramming(specialAmmo)
        : ''}
      ${this.renderAttack()}
      ${[...gearTraits, ...weaponTraits, ...accessories].map(
        (trait) =>
          html`<colored-tag type="info">${localize(trait)}</colored-tag>`,
      )}
    `;
  }

  private renderAmmoProgramming(ammo: FirearmAmmo) {
    const { specialAmmoModeIndex, availableShots } = this.weapon;
    const ammoModes = mapToObj.indexed(ammo.modes, ({ name }, index) => [
      String(index),
      name,
    ]);

    return html`
      <div class="ammo-modes">
        <mwc-icon-button
          icon="transform"
          class="transform-button"
          @click=${this.openAmmoTransformer}
          ?disabled=${!this.weapon.editable}
        ></mwc-icon-button>
        ${renderAutoForm({
          props: { mode: String(specialAmmoModeIndex) },
          update: ({ mode }) =>
            this.weapon.updater
              .path('data', 'ammo', 'selectedModeIndex')
              .commit(Number(mode) || 0),
          fields: ({ mode }) =>
            renderSelectField({ ...mode, label: '' }, Object.keys(ammoModes), {
              altLabel: (modeId) => ammoModes[modeId] || modeId,
            }),
        })}
        <sl-group label=${localize('availableShots')}
          ><span class="available-shots">${availableShots}</span></sl-group
        >
      </div>
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
    const [specialAmmo, mode] = attack.specialAmmo ?? [];

    return html`
      ${specialAmmo?.payload
        ? html`<colored-tag type="info"
            ><span>${localize('ammo')} ${localize('payload')}</span
            ><span slot="after">${specialAmmo.payload.name}</span></colored-tag
          >`
        : ''}
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
        <colored-tag type="info" class="attack-info"
          >${info} ${mode ? renderFirearmAmmoDetails(mode) : ''}
        </colored-tag>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-firearm-attacks': CharacterViewFirearmAttacks;
  }
}
