import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startRangedAttack } from '@src/combat/attack-init';
import type { AttackType } from '@src/combat/attacks';
import type { BeamWeapon } from '@src/entities/item/proxies/beam-weapon';
import { FiringMode, firingModeCost } from '@src/features/firing-modes';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
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
        }
        .attack {
          width: 100%;
          display: flex;
          flex-flow: row wrap;
        }
      `,
    ];
  }

  @property({ attribute: false }) weapon!: BeamWeapon;

  private fire(attackType: AttackType, firingMode: FiringMode) {
    const attack = this.weapon.attacks[attackType];
    const { character, token } = requestCharacter(this);

    if (!attack || !character) return;
    startRangedAttack({
      actor: character.actor,
      firingMode,
      token,
      weaponId: this.weapon.id,
      adjacentElement: this,
      attackType,
    });
  }

  render() {
    const { battery, editable, gearTraits, hasSecondaryAttack } = this.weapon;
    return html`
      ${this.renderAttack('primary')}
      ${hasSecondaryAttack ? this.renderAttack('secondary') : ''}
      <colored-tag type="usable" clickable ?disabled=${!editable}>
        <span>${localize('battery')}</span>
        <value-status
          slot="after"
          value=${battery.charge}
          max=${battery.max}
        ></value-status>
      </colored-tag>
      ${gearTraits.map(
        (trait) =>
          html`<colored-tag type="info">${localize(trait)}</colored-tag>`,
      )}
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
        ${attack.firingModes.map(
          (mode) => html`
            <colored-tag
              class="firing-mode"
              type="attack"
              ?disabled=${!editable || firingModeCost[mode] > availableShots}
              clickable
              title=${localize('mode')}
              @click=${() => this.fire(attackType, mode)}
            >
              ${localize('SHORT', mode)}
            </colored-tag>
            <colored-tag type="info">${info}</colored-tag>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-beam-attacks': CharacterViewBeamAttacks;
  }
}
