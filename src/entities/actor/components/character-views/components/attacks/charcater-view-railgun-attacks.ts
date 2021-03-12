import { formatArmorUsed } from '@src/combat/attack-formatting';
import { startRangedAttack } from '@src/combat/attack-init';
import type { Railgun } from '@src/entities/item/proxies/railgun';
import { subscribeToEnvironmentChange } from '@src/features/environment';
import {
  createFiringModeGroup,
  FiringMode,
  firingModeCost,
} from '@src/features/firing-modes';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { joinLabeledFormulas } from '@src/foundry/rolls';
import { formatDamageType } from '@src/health/health';
import { openMenu } from '@src/open-menu';
import { getWeaponRange } from '@src/success-test/range-modifiers';
import { notEmpty } from '@src/utility/helpers';
import { css, customElement, html, LitElement, property } from 'lit-element';
import { compact } from 'remeda';
import { requestCharacter } from '../../character-request-event';
import styles from './attack-info-styles.scss';

@customElement('character-view-railgun-attacks')
export class CharacterViewRailgunAttacks extends LitElement {
  static get is() {
    return 'character-view-railgun-attacks' as const;
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
        .battery {
          display: inline-flex;
          align-items: center;
        }
        .recharge {
          display: inline-flex;
          align-items: center;
          color: var(--color-text-lighter);
          margin-left: 0.5ch;
        }
      `,
    ];
  }

  @property({ attribute: false }) weapon!: Railgun;

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

  private replaceBattery(ev: MouseEvent) {
    openMenu({
      header: { heading: `${this.weapon.name} ${localize('battery')}` },
      content: [
        {
          label: localize('reload'),
          sublabel: `${localize('swap')} ${localize('battery')} (${localize(
            'complex',
          )} ${localize('action')}) `,
          callback: () => this.weapon.swapBattery(),
          disabled: this.weapon.fullyCharged,
        },
      ],
      position: ev,
    });
  }

  private reloadAmmo(ev: MouseEvent) {
    //   openMenu({})
  }

  private shapeMenu(ev: MouseEvent) {
    //   openMenu({})
  }

  render() {
    const {
      battery,
      editable,
      gearTraits,
      weaponTraits,
      accessories,
      totalCharge,
      fullyCharged,
      ammoState,
    } = this.weapon;
    const shapes = this.weapon.shapeChanging ? this.weapon.shapes : null;
    return html`
      ${notEmpty(shapes)
        ? html`
            <colored-tag
              type="usable"
              clickable
              ?disabled=${!editable}
              @click=${this.shapeMenu}
            >
              <span>${localize('shape')}</span>
              <span slot="after">${this.weapon.shapeName}</span>
            </colored-tag>
          `
        : ''}
      <colored-tag type="info"
        >${localize('range')}
        <span slot="after">${getWeaponRange(this.weapon)}</span>
      </colored-tag>
      ${[...gearTraits, ...weaponTraits, ...accessories].map(
        (trait) =>
          html`<colored-tag type="info">${localize(trait)}</colored-tag>`,
      )}
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
      <colored-tag
        type="usable"
        clickable
        ?disabled=${!editable}
        @click=${this.replaceBattery}
      >
        <span class="battery">
          <mwc-icon
            >${fullyCharged
              ? 'battery_full'
              : 'battery_charging_full'}</mwc-icon
          >
          ${localize('battery')}
          ${fullyCharged
            ? ''
            : html`<span class="recharge">
                ${prettyMilliseconds(this.weapon.timeTillFullyCharged)}</span
              >`}
        </span>
        <value-status
          slot="after"
          value=${totalCharge}
          max=${battery.max}
        ></value-status>
      </colored-tag>
      ${this.renderAttack()}
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
        <colored-tag type="info" class="attack-info">${info} </colored-tag>
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
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-railgun-attacks': CharacterViewRailgunAttacks;
  }
}
