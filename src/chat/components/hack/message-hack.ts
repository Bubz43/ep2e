import type {
  HackMessageData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { AptitudeType, SuperiorResultEffect } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { Software } from '@src/entities/item/proxies/software';
import { SkillType } from '@src/features/skills';
import { SpecialTest } from '@src/features/tags';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { AptitudeCheckControls } from '@src/success-test/components/aptitude-check-controls/aptitude-check-controls';
import { SkillTestControls } from '@src/success-test/components/skill-test-controls/skill-test-controls';
import { SuccessTestResult } from '@src/success-test/success-test';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { compact, concat, last, pick, pipe } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-hack.scss';

@customElement('message-hack')
export class MessageHack extends MessageElement {
  static get is() {
    return 'message-hack' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) hack!: HackMessageData;

  @property({ type: Object }) successTest?: SuccessTestMessageData;

  get software() {
    return new Software({
      data: this.hack.software,
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
            skill: actor.proxy.ego.getCommonSkill(SkillType.Infosec),
            opposing: {
              testName: `${this.software.name} ${localize('meshAttack')}`,
            },
          };
        },
      });
    });
  }

  private createDamageMessage() {
    const { message, successTestInfo } = this;
    if (!successTestInfo) return;

    const { attacks, name } = this.software;
    const { result: testResult } = successTestInfo;
    const { attackType = 'primary' } = this.hack;

    const attack = attacks[attackType] || attacks.primary;

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
      ],
      compact,
      concat(attack?.rollFormulas ?? []),
      rollLabeledFormulas,
    );
    message.createSimilar({
      header: {
        heading: name,
        subheadings: [localize('meshAttack')],
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

  private startSpecialTest() {
    const { attacks, name } = this.software;
    const { attackType = 'primary' } = this.hack;

    const attack = attacks[attackType] || attacks.primary;
    const { aptitudeCheckInfo } = attack;
    pickOrDefaultCharacter((character) => {
      AptitudeCheckControls.openWindow({
        entities: { actor: character.actor },
        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;
          return {
            ego: actor.proxy.ego,
            character: actor.proxy,
            aptitude: AptitudeType.Somatics,
            special: {
              type: SpecialTest.Custom,
              checkInfo: aptitudeCheckInfo,
              source: name,
              messageRef: this.message.id,
            },
          };
        },
      });
    });
  }

  render() {
    const { attacks, name } = this.software;
    const { disabled } = this;
    const { attackType = 'primary' } = this.hack;

    const attack = attacks[attackType] || attacks.primary;
    const { aptitudeCheckInfo } = attack;

    return html`
      ${this.successTest ? this.renderOppose() : ''}
      ${!disabled && this.successTest && notEmpty(attack.rollFormulas)
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
      ${notEmpty(attack.attackTraits)
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
      ${aptitudeCheckInfo.check
        ? html`<mwc-button
            outlined
            dense
            class="check"
            @click=${this.startSpecialTest}
          >
            ${localize(aptitudeCheckInfo.check)} ${localize('check')}
            ${localize('SHORT', 'versus')} ${localize('effects')}
          </mwc-button>`
        : ''}
    `;
  }

  private renderOppose() {
    return html`
      <sl-group label=${localize('defendWith')} class="defense">
        <wl-list-item clickable @click=${this.startDefense}
          >${localize(SkillType.Infosec)}
        </wl-list-item>
      </sl-group>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-hack': MessageHack;
  }
}
