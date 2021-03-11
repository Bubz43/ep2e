import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startRangedAttack } from '@src/combat/attack-init';
import type { AttackType } from '@src/combat/attacks';
import type { BeamWeapon } from '@src/entities/item/proxies/beam-weapon';
import { subscribeToEnvironmentChange } from '@src/features/environment';
import {
  createFiringModeGroup,
  FiringMode,
  firingModeCost,
} from '@src/features/firing-modes';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { getWeaponRange } from '@src/success-test/range-modifiers';
import { notEmpty } from '@src/utility/helpers';
import { css, customElement, html, LitElement, property } from 'lit-element';
import { compact, map } from 'remeda';
import { requestCharacter } from '../../character-request-event';
import styles from './attack-info-styles.scss';

@customElement('character-view-beam-attacks')
export class CharacterViewBeamAttacks extends LitElement {
  static get is() {
    return 'character-view-beam-attacks' as const;
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
          padding: 0.25rem 0.5rem 0;
        }
      `,
    ];
  }

  @property({ attribute: false }) weapon!: BeamWeapon;

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

  private fire(attackType: AttackType, firingMode: FiringMode) {
    const attack = this.weapon.attacks[attackType];
    const { character, token } = requestCharacter(this);

    if (!attack || !character) return;
    startRangedAttack({
      actor: character.actor,
      firingModeGroup: createFiringModeGroup(firingMode),
      token,
      weaponId: this.weapon.id,
      adjacentElement: this,
      attackType,
    });
  }

  render() {
    const {
      battery,
      editable,
      gearTraits,
      hasSecondaryAttack,
      weaponTraits,
      accessories,
    } = this.weapon;
    return html`
      <colored-tag type="info"
        >${localize('range')}
        <span slot="after">${getWeaponRange(this.weapon)}</span>
      </colored-tag>
      ${[...gearTraits, ...weaponTraits, ...accessories].map(
        (trait) =>
          html`<colored-tag type="info">${localize(trait)}</colored-tag>`,
      )}
      <colored-tag type="usable" clickable ?disabled=${!editable}>
        <span>${localize('battery')}</span>
        <value-status
          slot="after"
          value=${battery.charge}
          max=${battery.max}
        ></value-status>
      </colored-tag>
      ${this.renderAttack('primary')}
      ${hasSecondaryAttack ? this.renderAttack('secondary') : ''}
    `;
  }

  private renderAttack(attackType: AttackType) {
    const attack = this.weapon.attacks[attackType];
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
    ]).join('. ');

    return html`
      <div class="attack">
        <colored-tag type="info" class="attack-info"
          >${info}
          ${this.weapon.hasSecondaryAttack
            ? html` <span slot="after">${attack.label}</span> `
            : ''}
        </colored-tag>
        <div class="firing-modes">
          ${attack.firingModes.map(
            (mode) => html`
              <colored-tag
                class="firing-mode"
                type="attack"
                ?disabled=${!editable || firingModeCost[mode] > availableShots}
                clickable
                title=${localize(mode)}
                @click=${() => this.fire(attackType, mode)}
              >
                ${localize('SHORT', mode)}
              </colored-tag>
            `,
          )}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-beam-attacks': CharacterViewBeamAttacks;
  }
}
