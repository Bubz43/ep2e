import type {
  DamageMessageData,
  MeleeWeaponMessageData,
} from '@src/chat/message-data';
import { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { customElement, LitElement, property, html } from 'lit-element';
import { compact, concat, pick, pipe } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-melee-attack.scss';

@customElement('message-melee-attack')
export class MessageMeleeAttack extends MessageElement {
  static get is() {
    return 'message-melee-attack' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) meleeAttack!: MeleeWeaponMessageData;

  get weapon() {
    return new MeleeWeapon({
      data: this.meleeAttack.weapon,
      embedded: null,
    });
  }

  private createCoatingMessage() {
    const { weapon } = this;
  }

  private createPayloadMessage() {}

  render() {
    const {
      attacks,
      coating,
      payload,
      augmentUnarmed,
      name,
      hasSecondaryAttack,
    } = this.weapon;
    const {
      attackType = 'primary',
      unarmedDV,
      touchOnly,
      aggressive,
      charging,
      extraWeapon,
    } = this.meleeAttack;

    const { disabled } = this;
    // TODO apply unarmed

    const attack = attacks[attackType] || attacks.primary;

    const damage: DamageMessageData | null = touchOnly
      ? null
      : {
          ...pick(attack, [
            'armorPiercing',
            'armorUsed',
            'damageType',
            'notes',
            'reduceAVbyDV',
          ]),
          source: `${name} ${hasSecondaryAttack ? `[${attack.label}]` : ''}`,
          rolledFormulas: pipe(
            attack.rollFormulas,
            concat(
              compact([
                aggressive && {
                  label: localize('aggressive'),
                  formula: '+1d10',
                },
                charging && { label: localize('charging'), formula: '+1d6' },
                extraWeapon && {
                  label: localize('extraWeapon'),
                  formula: '+1d6',
                },
              ]),
            ),
            rollLabeledFormulas,
          ),
        };
    return html`
      ${damage
        ? html` <message-damage .damage=${damage}></message-damage> `
        : ''}
      ${coating
        ? html`
            <mwc-button
              ?disabled=${disabled}
              @click=${this.createCoatingMessage}
              >${localize('applyCoating')}</mwc-button
            >
          `
        : ''}
      ${payload
        ? html`
            <mwc-button
              ?disabled=${disabled}
              @click=${this.createPayloadMessage}
              >${localize('trigger')} ${localize('payload')}</mwc-button
            >
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-melee-attack': MessageMeleeAttack;
  }
}
