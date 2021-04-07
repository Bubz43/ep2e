import type {
  PsiTestData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { AptitudeType, PsiPush } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { AptitudeCheckControls } from '@src/success-test/components/aptitude-check-controls/aptitude-check-controls';
import { InfectionTestControls } from '@src/success-test/components/infection-test-controls/infection-test-controls';
import { SuccessTestResult } from '@src/success-test/success-test';
import { customElement, html, property } from 'lit-element';
import { last } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-psi-test.scss';

@customElement('message-psi-test')
export class MessagePsiTest extends MessageElement {
  static get is() {
    return 'message-psi-test' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) psiTest!: PsiTestData;

  @property({ type: Object }) successTest!: SuccessTestMessageData;

  get successTestInfo() {
    const test = this.successTest;
    const result = last(test.states || [])?.result;

    return result && test
      ? {
          result,
          superiorEffects: test.superiorResultEffects,
        }
      : null;
  }

  startDefense() {
    pickOrDefaultCharacter((character) => {
      AptitudeCheckControls.openWindow({
        entities: { actor: character.actor },
        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;

          return {
            ego: actor.proxy.ego,
            character: actor.proxy,

            aptitude: AptitudeType.Willpower,
            halve: this.psiTest.push === PsiPush.IncreasedPower,
          };
        },
      });
    });
  }

  private startInfectionTest() {
    const { actor } = this.message;
    if (actor?.proxy.type !== ActorType.Character) return;

    InfectionTestControls.openWindow({
      entities: { actor },
      relativeEl: this,
      getState: (actor) => {
        if (actor.proxy.type === ActorType.Character && actor.proxy.psi) {
          return {
            character: actor.proxy,
            psi: actor.proxy.psi,
          };
        }
        return null;
      },
    });
  }

  private rollCriticalFailureDamage() {
    this.rollSelfDamage('criticalFailure');
  }

  private rollPushDamage() {
    this.rollSelfDamage('push');
  }

  private rollSelfDamage(source: 'criticalFailure' | 'push') {
    this.message.createSimilar({
      damage: {
        source: localize(source),
        damageType: HealthType.Physical,
        rolledFormulas: rollLabeledFormulas([
          { label: localize(source), formula: '1d6' },
        ]),
      },
    });
  }

  render() {
    const { disabled, successTestInfo, psiTest } = this;

    return html`
      <sl-group label=${localize('opposeWith')} class="defense">
        <wl-list-item clickable @click=${this.startDefense}>
          ${localize(AptitudeType.Willpower)}
          ${psiTest.push === PsiPush.IncreasedPower ? ` ÷ 2` : ''}
        </wl-list-item>
      </sl-group>

      ${disabled
        ? ''
        : html`
            ${successTestInfo?.result === SuccessTestResult.CriticalFailure
              ? html`
                  <mwc-button outlined @click=${this.rollCriticalFailureDamage}>
                    ${localize(successTestInfo.result)} - ${localize('roll')}
                    ${localize('SHORT', 'damageValue')} 1d6
                  </mwc-button>
                `
              : ''}
            ${psiTest.push && !psiTest.pushNegation
              ? html`
                  <mwc-button outlined @click=${this.rollPushDamage}>
                    ${localize('pushed')} - ${localize('roll')}
                    ${localize('SHORT', 'damageValue')} 1d6
                  </mwc-button>
                `
              : ''}
            ${psiTest.push &&
            psiTest.variableInfection &&
            psiTest.pushNegation !== 'all'
              ? html`
                  <mwc-button
                    outlined
                    @click=${this.startInfectionTest}
                    class="infection-test"
                  >
                    ${localize('pushed')} - ${localize('infectionTest')}
                  </mwc-button>
                `
              : ''}
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-psi-test': MessagePsiTest;
  }
}
