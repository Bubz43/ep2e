import type {
  InfectionTestData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import { influenceInfo, influenceRolls } from '@src/features/psi-influence';
import { localize } from '@src/foundry/localization';
import { rollFormula } from '@src/foundry/rolls';
import {
  grantedSuperiorResultEffects,
  isSuccessfullTestResult,
  SuccessTestResult,
} from '@src/success-test/success-test';
import { customElement, html, property } from 'lit-element';
import { last, mapToObj } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-infection-test.scss';

@customElement('message-infection-test')
export class MessageInfectionTest extends MessageElement {
  static get is() {
    return 'message-infection-test' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) successTest?: SuccessTestMessageData;

  @property({ type: Object }) infectionTest!: InfectionTestData;

  get successTestInfo() {
    const test = this.successTest;
    const result = last(test?.states || [])?.result;

    return result && test
      ? {
          result,
          superiorEffects: test.superiorResultEffects,
        }
      : null;
  }

  get psi() {
    const { actor } = this.message;
    return actor?.proxy.type === ActorType.Character ? actor.proxy.psi : null;
  }

  private rollInfluences() {
    const { result } = this.successTestInfo ?? {};
    const increases = grantedSuperiorResultEffects(result);

    const roll = rollFormula(`1d6 ${increases ? `+${increases}` : ''}`);
    const { psi } = this;
    if (!roll || !psi) return;
    this.message.createSimilar({
      influenceRoll: {
        rollData: roll.toJSON(),
        influences: mapToObj(influenceRolls, (roll) => {
          const influence = psi.fullInfluences[roll];
          return [
            roll,
            {
              id: influence.id,
              name: influenceInfo(influence).name,
            },
          ];
        }),
      },
    });
  }

  private recedeInfection() {
    this.psi?.recedeInfection();
  }

  render() {
    if (this.infectionTest.testSkipped) {
      return html`<p>${localize('infectionTest')} ${localize('avoided')}</p>`;
    }
    //   const { moxieUse } = this.infectionTest;
    const { result } = this.successTestInfo ?? {};
    if (!result) return '';
    const { disabled } = this;
    return html`
      ${isSuccessfullTestResult(result)
        ? html`
            <mwc-button
              dense
              @click=${this.rollInfluences}
              ?disabled=${disabled}
              >${localize('roll')}
              ${localize('infectionInfluences')}</mwc-button
            >
            ${result === SuccessTestResult.CriticalSuccess
              ? html`
                  <div class="critical-effects">
                    <mwc-button
                      @click=${() =>
                        this.psi?.setCriticalSuccessState('checkoutTime', true)}
                      ?disabled=${!game.user.isGM}
                      >${localize('checkoutTime')}</mwc-button
                    >
                    <mwc-button
                      @click=${() =>
                        this.psi?.setCriticalSuccessState('interference', true)}
                      ?disabled=${!game.user.isGM}
                      >${localize('interference')}</mwc-button
                    >
                  </div>
                `
              : ''}
          `
        : result === SuccessTestResult.CriticalFailure
        ? html`
            <mwc-button ?disabled=${disabled} @click=${this.recedeInfection}
              >${localize('apply')} ${localize('influence')}
              ${localize('immunity')}</mwc-button
            >
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-infection-test': MessageInfectionTest;
  }
}
