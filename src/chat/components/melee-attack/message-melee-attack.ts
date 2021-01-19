import type {
  DamageMessageData,
  MeleeWeaponMessageData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import {
  SubstanceApplicationMethod,
  SuperiorResultEffect,
} from '@src/data-enums';
import { ExplosiveSettingsForm } from '@src/entities/actor/components/character-views/components/attacks/explosive-settings/explosive-settings-form';
import { MeleeSettingsForm } from '@src/entities/actor/components/character-views/components/attacks/melee-settings/melee-settings-form';
import { ItemType } from '@src/entities/entity-types';
import { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import {
  isSuccessfullTestResult,
  SuccessTestResult,
} from '@src/success-test/success-test';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { compact, concat, last, map, pick, pipe } from 'remeda';
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

  @property({ type: Object }) successTest?: SuccessTestMessageData;

  get weapon() {
    return new MeleeWeapon({
      data: this.meleeAttack.weapon,
      embedded: null,
    });
  }

  get successTestInfo() {
    const test = this?.successTest;
    const result = last(test?.states || [])?.result;

    return result && test
      ? {
          result,
          superiorEffects: test.superiorResultEffects,
        }
      : null;
  }

  private editSettings() {
    const { weapon, ...settings } = this.meleeAttack;
    MeleeSettingsForm.openWindow({
      initialSettings: settings,
      meleeWeapon: this.weapon,
      requireSubmit: true,
      adjacentEl: this,
      update: ({ detail }) => this.getUpdater('meleeAttack').commit(detail),
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

  private createDamageMessage() {
    const { message, successTestInfo } = this;
    if (!successTestInfo) return;

    const { attacks, augmentUnarmed, name, hasSecondaryAttack } = this.weapon;
    const { result: testResult } = successTestInfo;
    const {
      attackType = 'primary',
      unarmedDV,
      aggressive,
      charging,
      extraWeapon,
    } = this.meleeAttack;
    const attack = attacks[attackType] || attacks.primary;

    const superiorDamage =
      successTestInfo?.superiorEffects?.filter(
        (e) => e === SuperiorResultEffect.Damage,
      ) || [];

    message.createSimilar({
      damage: {
        ...pick(attack, [
          'armorPiercing',
          'armorUsed',
          'damageType',
          'notes',
          'reduceAVbyDV',
        ]),
        source: `${name} ${hasSecondaryAttack ? `[${attack.label}]` : ''}`,
        multiplier: testResult === SuccessTestResult.CriticalSuccess ? 2 : 1,
        rolledFormulas: pipe(
          attack.rollFormulas,
          concat(
            compact([
              testResult === SuccessTestResult.SuperiorSuccess &&
                superiorDamage.length >= 1 && {
                  label: localize(testResult),
                  formula: '+1d6',
                },
              testResult === SuccessTestResult.SuperiorSuccessX2 &&
                superiorDamage.length >= 1 && {
                  label: localize(testResult),
                  formula: successTestInfo
                    ? `+${superiorDamage.length}d6`
                    : '+2d6',
                },
              augmentUnarmed && {
                label: localize('unarmedDV'),
                formula: unarmedDV || '0',
              },
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
      },
    });
  }

  render() {
    const { attacks, coating, payload, hasSecondaryAttack } = this.weapon;
    const { disabled } = this;

    const {
      attackType = 'primary',
      touchOnly,
      appliedCoating,
      appliedPayload,
    } = this.meleeAttack;

    const attack = attacks[attackType] || attacks.primary;

    const options = ([
      'touchOnly',
      'aggressive',
      'charging',
      'extraWeapon',
    ] as const).filter((key) => this.meleeAttack[key]);

    return html`
      <div class="settings">
        ${hasSecondaryAttack ? attack.label : ''}
        ${disabled || !this.successTest
          ? ''
          : html`
              <mwc-icon-button
                icon="settings"
                @click=${this.editSettings}
                ?disabled=${disabled}
              ></mwc-icon-button>
            `}
      </div>

      ${notEmpty(options)
        ? html` <p class="options">${map(options, localize).join('  •  ')}</p> `
        : ''}
      ${(touchOnly && !disabled) || !this.successTest
        ? ''
        : html`
            <mwc-button
              outlined
              dense
              class="roll-damage"
              @click=${this.createDamageMessage}
              >${localize('roll')} ${localize('damage')}</mwc-button
            >
          `}
      ${notEmpty(attack.attackTraits)
        ? html`
            <message-attack-traits
              .attackTraitInfo=${{ traits: attack.attackTraits }}
            ></message-attack-traits>
          `
        : ''}
      ${!disabled && (coating || payload)
        ? html`<div class="additional">
            ${coating
              ? html`
                  <mwc-button
                    dense
                    outlined
                    ?disabled=${!!appliedCoating}
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
                    outlined
                    ?disabled=${!!appliedPayload}
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
