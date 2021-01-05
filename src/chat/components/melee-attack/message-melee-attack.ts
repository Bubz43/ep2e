import { createMessage } from '@src/chat/create-message';
import type {
  DamageMessageData,
  MeleeWeaponMessageData,
} from '@src/chat/message-data';
import { SubstanceApplicationMethod } from '@src/data-enums';
import { ExplosiveSettingsForm } from '@src/entities/actor/components/character-views/components/attacks/explosive-settings/explosive-settings-form';
import { ActorType, ItemType } from '@src/entities/entity-types';
import { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { notEmpty } from '@src/utility/helpers';
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

  private async createCoatingMessage() {
    const { weapon, message } = this;
    const { coating } = weapon;
    if (!coating) return;
    const header = coating.messageHeader;
    header.subheadings = [header.subheadings || []]
      .flat()
      .concat(`${weapon.name} [${localize('coating')}]`);
    await message.createSimilar({
      header,
      substanceUse: {
        substance: coating.getDataCopy(),
        useMethod: coating.isChemical
          ? 'use'
          : SubstanceApplicationMethod.Dermal,
      }, // TODO injected
    });
    const item = message.actor?.items?.get(weapon.id);
    if (item?.proxy.type === ItemType.MeleeWeapon) {
      await item.proxy.removeCoating();
    }
    this.getUpdater('meleeAttack').commit({ appliedCoating: true });
  }

  private createPayloadMessage() {
    const { payload, name, id } = this.weapon;
    const { message } = this;
    if (!payload) return;
    ExplosiveSettingsForm.openWindow({
      explosive: payload,
      requireSubmit: true,
      update: async ({ detail: settings }) => {
        const header = payload.messageHeader;
        header.subheadings = [header.subheadings || []]
          .flat()
          .concat(`${name} [${localize('payload')}]`);
        await message.createSimilar({
          header,
          explosiveUse: {
            ...settings,
            explosive: payload.getDataCopy(),
          },
        });
        const item = message.actor?.items?.get(id);
        if (item?.proxy.type === ItemType.MeleeWeapon) {
          await item.proxy.removePayload();
        }
        this.getUpdater('meleeAttack').commit({ appliedPayload: true });
      },
    });
  }

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
      appliedCoating,
      appliedPayload,
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

    // TODO edit settings
    return html`
      <div class="settings">${hasSecondaryAttack ? attack.label : ''}</div>
      ${damage
        ? html` <message-damage .damage=${damage}></message-damage> `
        : ''}
      ${notEmpty(attack.attackTraits)
        ? html`
            <message-attack-traits
              .attackTraitInfo=${{ traits: attack.attackTraits }}
            ></message-attack-traits>
          `
        : ''}
      ${coating || payload
        ? html`<div class="additional">
            ${coating
              ? html`
                  <mwc-button
                    dense
                    ?disabled=${disabled || !!appliedCoating}
                    @click=${this.createCoatingMessage}
                    >${appliedCoating
                      ? `${localize('applied')} ${localize('coating')}`
                      : localize('applyCoating')}</mwc-button
                  >
                `
              : ''}
            ${payload
              ? html`
                  <mwc-button
                    dense
                    ?disabled=${disabled || !!appliedPayload}
                    @click=${this.createPayloadMessage}
                    >${localize(appliedPayload ? 'applied' : 'trigger')}
                    ${localize('payload')}</mwc-button
                  >
                `
              : ''}
          </div>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-melee-attack': MessageMeleeAttack;
  }
}
