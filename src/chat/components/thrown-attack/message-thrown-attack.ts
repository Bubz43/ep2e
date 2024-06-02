import type {
  SuccessTestMessageData,
  ThrownWeaponMessageData,
} from '@src/chat/message-data';
import {
  SubstanceApplicationMethod,
  SuperiorResultEffect,
} from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { ThrownWeapon } from '@src/entities/item/proxies/thrown-weapon';
import { SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { SkillTestControls } from '@src/success-test/components/skill-test-controls/skill-test-controls';
import { SuccessTestResult } from '@src/success-test/success-test';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { compact, concat, last, pick, pipe } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-thrown-attack.scss';

@customElement('message-thrown-attack')
export class MessageThrownAttack extends MessageElement {
  static get is() {
    return 'message-thrown-attack' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) thrownAttack!: ThrownWeaponMessageData;

  @property({ type: Object }) successTest?: SuccessTestMessageData;

  get weapon() {
    return new ThrownWeapon({
      data: this.thrownAttack.weapon,
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

  startDefense() {
    pickOrDefaultCharacter((character) => {
      SkillTestControls.openWindow({
        entities: { actor: character.actor },
        relativeEl: this,
        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;
          return {
            ego: actor.proxy.ego,
            character: actor.proxy,
            skill: actor.proxy.ego.getCommonSkill(SkillType.Fray),
            halve: true,
            opposing: {
              testName: `${this.weapon.name} ${localize('thrownAttack')}`,
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

    this.getUpdater('thrownAttack').commit({ appliedCoating: true });
  }

  private async createDamageMessage() {
    const { message, successTestInfo } = this;
    if (!successTestInfo) return;

    const { attacks, name } = this.weapon;
    const { result: testResult } = successTestInfo;
    const { damageModifiers } = this.thrownAttack;

    const { primary: attack } = attacks;

    const superiorDamage =
      successTestInfo?.superiorEffects?.filter(
        (e) => e === SuperiorResultEffect.Damage,
      ) || [];

    const multiplier = testResult === SuccessTestResult.CriticalSuccess ? 2 : 1;
    const rolled = await pipe(
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

        ...(damageModifiers ?? []),
      ],
      compact,
      concat(attack?.rollFormulas ?? []),
      rollLabeledFormulas,
    );
    message.createSimilar({
      header: {
        heading: name,
        subheadings: [localize('thrownWeapon')],
      },
      damage: {
        ...pick(attack, [
          'armorPiercing',
          'armorUsed',
          'damageType',
          'notes',
          'reduceAVbyDV',
        ]),
        source: name,
        multiplier,
        rolledFormulas: rolled,
      },
    });
  }

  render() {
    const { attacks, coating, name } = this.weapon;
    const { disabled } = this;

    const { appliedCoating, calledShot } = this.thrownAttack;

    const { primary: attack } = attacks;

    return html`
      ${this.successTest ? this.renderOppose() : ''}
      ${calledShot
        ? html`
            <p class="options">
              ${`${localize('calledShot')}: ${localize(calledShot)}`}
            </p>
          `
        : ''}
      ${!disabled && this.successTest
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
                source: name,
                testResult: this.successTestInfo?.result,
              }}
            ></message-attack-traits>
          `
        : ''}
      ${!disabled && coating
        ? html`<div class="additional">
            <mwc-button
              dense
              outlined
              ?disabled=${!!appliedCoating}
              @click=${this.createCoatingMessage}
              >${appliedCoating
                ? `${localize('applied')} ${localize('coating')}`
                : localize('applyCoating')}</mwc-button
            >
          </div>`
        : ''}
    `;
  }

  private renderOppose() {
    return html`
      <sl-group label=${localize('defendWith')} class="defense">
        <wl-list-item clickable @click=${this.startDefense}
          >${localize(SkillType.Fray)} ÷2
        </wl-list-item>
      </sl-group>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-thrown-attack': MessageThrownAttack;
  }
}
