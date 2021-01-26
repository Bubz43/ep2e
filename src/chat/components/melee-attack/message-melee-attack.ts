import type {
  MeleeWeaponMessageData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import {
  SubstanceApplicationMethod,
  SuperiorResultEffect,
} from '@src/data-enums';
import { ExplosiveSettingsForm } from '@src/entities/actor/components/character-views/components/attacks/explosive-settings/explosive-settings-form';
import { ActorType, ItemType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { formulasFromMeleeSettings } from '@src/entities/weapon-settings';
import { ArmorType } from '@src/features/active-armor';
import { Size } from '@src/features/size';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { SkillTestControls } from '@src/success-test/components/skill-test-controls/skill-test-controls';
import { SuccessTestResult } from '@src/success-test/success-test';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { compact, concat, last, pick, pipe } from 'remeda';
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
    return (
      this.meleeAttack.weapon &&
      new MeleeWeapon({
        data: this.meleeAttack.weapon,
        embedded: null,
      })
    );
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

  startDefense(skillType: SkillType) {
    pickOrDefaultCharacter((character) => {
      SkillTestControls.openWindow({
        entities: { actor: character.actor },
        relativeEl: this,
        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;
          return {
            ego: actor.proxy.ego,
            character: actor.proxy,
            skill: actor.proxy.ego.getCommonSkill(skillType),
            opposing: {
              testName: `${this.weapon?.name || localize('unarmed')} ${localize(
                'meleeAttack',
              )}`,
            },
          };
        },
      });
    });
  }

  private async createCoatingMessage() {
    const { weapon, message } = this;
    const { coating } = weapon ?? {};
    if (!coating || !weapon) return;
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
    const { payload, name, id } = this.weapon ?? {};
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

    const { attacks, augmentUnarmed, name, hasSecondaryAttack } =
      this.weapon ?? {};
    const { result: testResult } = successTestInfo;
    const {
      attackType = 'primary',
      unarmedDV,
      damageModifiers,
      morphSize,
    } = this.meleeAttack;

    const attack = attacks && (attacks[attackType] || attacks.primary);

    const superiorDamage =
      successTestInfo?.superiorEffects?.filter(
        (e) => e === SuperiorResultEffect.Damage,
      ) || [];

    const multiplier = testResult === SuccessTestResult.CriticalSuccess ? 2 : 1;
    const rolled = pipe(
      [
        testResult === SuccessTestResult.SuperiorSuccess &&
          superiorDamage.length >= 1 && {
            label: localize(testResult),
            formula: '+1d6',
          },
        testResult === SuccessTestResult.SuperiorSuccessX2 &&
          superiorDamage.length >= 1 && {
            label: localize(testResult),
            formula: successTestInfo ? `+${superiorDamage.length}d6` : '+2d6',
          },
        (augmentUnarmed || augmentUnarmed == null) && {
          label: localize('unarmedDV'),
          formula: unarmedDV || '0',
        },
        ...formulasFromMeleeSettings(this.meleeAttack),
        ...(damageModifiers ?? []),
      ],
      compact,
      concat(attack?.rollFormulas ?? []),
      rollLabeledFormulas,
    );
    message.createSimilar({
      header: {
        heading: name ?? localize('unarmed'),
        subheadings: [localize('meleeAttack')],
      },
      damage: {
        ...pick(
          attack ?? {
            armorPiercing: false,
            armorUsed: [ArmorType.Kinetic],
            damageType: HealthType.Physical,
            notes: '',
            reduceAVbyDV: false,
          },
          ['armorPiercing', 'armorUsed', 'damageType', 'notes', 'reduceAVbyDV'],
        ),
        source: `${name || localize('unarmed')} ${
          hasSecondaryAttack ? `[${attack?.label}]` : ''
        }`,
        multiplier:
          morphSize === Size.Small ? (multiplier === 2 ? 1 : 0.5) : multiplier,
        rolledFormulas: rolled,
      },
    });
  }

  render() {
    const { attacks, coating, payload, hasSecondaryAttack, name } =
      this.weapon ?? {};
    const { disabled } = this;

    const {
      attackType = 'primary',
      touchOnly,
      appliedCoating,
      appliedPayload,
      calledShot,
    } = this.meleeAttack;

    const attack = attacks && (attacks[attackType] || attacks.primary);

    const options = ([
      'touchOnly',
      'aggressive',
      'charging',
      'extraWeapons',
      'oneHanded',
    ] as const).flatMap((key) => (this.meleeAttack[key] ? localize(key) : []));

    if (calledShot) {
      options.push(`${localize('calledShot')}: ${localize(calledShot)}`);
    }

    return html`
      ${this.successTest ? this.renderOppose() : ''}

      <div class="settings">
        ${hasSecondaryAttack && attack ? attack.label : ''}
      </div>

      ${notEmpty(options)
        ? html` <p class="options">${options.join('  •  ')}</p> `
        : ''}
      ${!disabled && !touchOnly && this.successTest
        ? html`
            <mwc-button
              outlined
              dense
              class="roll-damage"
              @click=${this.createDamageMessage}
              >${localize('roll')} ${localize('damage')}</mwc-button
            >
          `
        : ''}
      ${attack && notEmpty(attack.attackTraits)
        ? html`
            <message-attack-traits
              .attackTraitInfo=${{
                traits: attack.attackTraits,
                source: name ?? localize('unarmed'),
              }}
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

  private renderOppose() {
    return html`
      <sl-group label=${localize('defendWith')} class="defense">
        ${[SkillType.Melee, SkillType.Fray].map(
          (skillType) => html`
            <wl-list-item clickable @click=${() => this.startDefense(skillType)}
              >${localize(skillType)}
            </wl-list-item>
          `,
        )}
      </sl-group>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-melee-attack': MessageMeleeAttack;
  }
}
