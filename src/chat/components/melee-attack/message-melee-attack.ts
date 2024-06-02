import type {
  MeleeWeaponMessageData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { meleeDamage } from '@src/combat/melee-damage';
import { SubstanceApplicationMethod } from '@src/data-enums';
import { ExplosiveSettingsForm } from '@src/entities/actor/components/character-views/components/attacks/explosive-settings/explosive-settings-form';
import { ActorType, ItemType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { Size } from '@src/features/size';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { SkillTestControls } from '@src/success-test/components/skill-test-controls/skill-test-controls';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { compact, last } from 'remeda';
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
    if (
      item?.proxy.type === ItemType.MeleeWeapon &&
      !item.proxy.permanentCoating
    ) {
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
        const item = id ? message.actor?.items?.get(id) : null;
        if (item?.proxy.type === ItemType.MeleeWeapon) {
          await item.proxy.removePayload();
        }
        this.getUpdater('meleeAttack').commit({ appliedPayload: true });
      },
    });
  }

  private async createDamageMessage() {
    const { message, successTestInfo } = this;
    if (!successTestInfo) return;

    const { attacks, augmentUnarmed, name, hasSecondaryAttack } =
      this.weapon ?? {};
    const {
      attackType = 'primary',
      unarmedDV,
      damageModifiers,
      morphSize,
      alwaysArmorPiercing,
    } = this.meleeAttack;

    const attack = attacks && (attacks[attackType] || attacks.primary);

    const damage = await meleeDamage({
      attack,
      successTestInfo,
      augmentUnarmed,
      unarmedDV,
      damageModifiers,
      settings: this.meleeAttack,
      morphSize,
      alwaysArmorPiercing,
      source: `${name || localize('unarmed')} ${
        hasSecondaryAttack ? `[${attack?.label}]` : ''
      }`,
    });

    message.createSimilar({
      header: {
        heading: name ?? localize('unarmed'),
        subheadings: compact([
          localize('meleeAttack'),
          morphSize &&
            morphSize !== Size.Medium &&
            ` ${localize('user')}: ${localize(morphSize)}`,
        ]),
      },
      damage,
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

    const options = (
      [
        'touchOnly',
        'aggressive',
        'charging',
        'extraWeapons',
        'oneHanded',
      ] as const
    ).flatMap((key) => (this.meleeAttack[key] ? localize(key) : []));

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
                testResult: this.successTestInfo?.result,
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
