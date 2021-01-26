import type {
  SpecialTestData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import { ConditionType } from '@src/features/conditions';
import { addFeature } from '@src/features/feature-helpers';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { SpecialTest } from '@src/features/tags';
import {
  createTemporaryFeature,
  TemporaryCondition,
} from '@src/features/temporary';
import { CommonInterval } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import {
  grantedSuperiorResultEffects,
  isSuccessfullTestResult,
  SuccessTestResult,
} from '@src/success-test/success-test';
import { customElement, LitElement, property, html } from 'lit-element';
import { last, pick, prop } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-special-test.scss';

@customElement('message-special-test')
export class MessageSpecialTest extends MessageElement {
  static get is() {
    return 'message-special-test' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) successTest!: SuccessTestMessageData;

  @property({ type: Object }) specialTest!: SpecialTestData;

  private applyShock() {
    const { actor } = this.message;
    const { testResult } = this;
    const isSuccess = testResult && isSuccessfullTestResult(testResult);

    if (actor?.proxy.type === ActorType.Character) {
      const { proxy: character } = actor;
      const tempConditions: TemporaryCondition[] = [];
      if (isSuccess) {
        tempConditions.push(
          createTemporaryFeature.condition({
            name: this.specialTest.source,
            duration: CommonInterval.Turn * 4,
            condition: ConditionType.Stunned,
          }),
        );
      } else {
        tempConditions.push(
          createTemporaryFeature.condition({
            name: this.specialTest.source,
            duration: CommonInterval.Turn * 2,
            condition: ConditionType.Prone,
          }),
          createTemporaryFeature.condition({
            name: this.specialTest.source,
            duration:
              CommonInterval.Turn *
              (2 + grantedSuperiorResultEffects(testResult)),
            condition: ConditionType.Incapacitated,
          }),
          createTemporaryFeature.condition({
            name: this.specialTest.source,
            duration: toMilliseconds({ minutes: 3 }),
            condition: ConditionType.Stunned,
          }),
        );
      }
      character.updater.batchCommits(() => {
        character.addConditions(tempConditions.map(prop('condition')));
        character.updater
          .path('data', 'temporary')
          .commit((temps) =>
            tempConditions.reduce(
              (accum, tempC) => addFeature(accum, tempC),
              temps,
            ),
          );
      });
    }
  }

  private applyBlinding() {
    const { actor } = this.message;
    const { testResult } = this;
    if (actor?.proxy.type === ActorType.Character) {
      const { proxy: character } = actor;
      const blindness = createTemporaryFeature.condition({
        name: this.specialTest.source,
        condition: ConditionType.Blinded,
        duration:
          testResult === SuccessTestResult.CriticalFailure
            ? -1
            : CommonInterval.Turn *
              (2 + grantedSuperiorResultEffects(testResult)),
      });
      character.updater.batchCommits(() => {
        character.addConditions([ConditionType.Blinded]);
        character.updater
          .path('data', 'temporary')
          .commit(addFeature(blindness));
      });
    }
  }

  private applyEntangling() {
    const { actor } = this.message;
    // TODO apply negative modifier to break out
    const { originalResult } = this.specialTest;
    if (actor?.proxy.type === ActorType.Character) {
      const { proxy: character } = actor;
      const entangled = createTemporaryFeature.condition({
        name: this.specialTest.source,
        condition: ConditionType.Grappled,
        duration: -1,
      });
      character.updater.batchCommits(() => {
        character.addConditions([ConditionType.Grappled]);
        character.updater
          .path('data', 'temporary')
          .commit(addFeature(entangled));
      });
    }
  }

  private applyKnockdown() {
    const { actor } = this.message;
    if (actor?.proxy.type === ActorType.Character) {
      actor.proxy.addConditions([ConditionType.Prone]);
    }
  }

  private applyStun() {
    const { actor } = this.message;
    const { testResult } = this;
    if (actor?.proxy.type === ActorType.Character) {
      const { proxy: character } = actor;
      const tempConditions = [
        createTemporaryFeature.condition({
          name: this.specialTest.source,
          condition: ConditionType.Stunned,
          duration:
            testResult === SuccessTestResult.CriticalFailure
              ? CommonInterval.Minute
              : CommonInterval.Turn *
                (2 + grantedSuperiorResultEffects(testResult)),
        }),
      ];

      if (testResult === SuccessTestResult.CriticalFailure) {
        tempConditions.push(
          createTemporaryFeature.condition({
            name: this.specialTest.source,
            condition: ConditionType.Incapacitated,
            duration: CommonInterval.Turn * 2,
          }),
        );
      }

      character.updater.batchCommits(() => {
        character.addConditions(tempConditions.map(prop('condition')));
        character.updater
          .path('data', 'temporary')
          .commit((temps) =>
            tempConditions.reduce(
              (accum, tempC) => addFeature(accum, tempC),
              temps,
            ),
          );
      });
    }
  }

  private get testResult() {
    return last(this.successTest.states)?.result;
  }

  render() {
    const result = last(this.successTest.states)?.result;
    if (!result) return html``;

    const isSuccess = isSuccessfullTestResult(result);
    const superiorCount = grantedSuperiorResultEffects(result);
    const { type } = this.specialTest;
    switch (type) {
      case SpecialTest.Blinding:
        return html`
          <wl-list-item
            clickable
            @click=${this.applyBlinding}
            ?disabled=${isSuccess}
          >
            ${isSuccess
              ? `${localize('resisted')} ${localize('blinding')}`
              : `${localize('apply')} ${localize('blindness')}`}
          </wl-list-item>
        `;

      case SpecialTest.Entangling:
        return html`
          <wl-list-item
            clickable
            @click=${this.applyEntangling}
            ?disabled=${isSuccess}
          >
            ${isSuccess
              ? `${localize('resisted')} ${localize('entangling')}`
              : html`${localize('apply')} ${localize('entangling')}
                ${superiorCount
                  ? html`
                      <span>
                        ${superiorCount * -10} ${localize('to')}
                        ${localize('breakFree')}
                      </span>
                    `
                  : ''} `}
          </wl-list-item>
        `;

      case SpecialTest.Knockdown:
        return html`
          <wl-list-item
            clickable
            @click=${this.applyKnockdown}
            ?disabled=${isSuccess}
          >
            ${isSuccess
              ? `${localize('resisted')} ${localize('knockdown')}`
              : `${localize('apply')} ${localize('knockdown')}`}
          </wl-list-item>
        `;

      case SpecialTest.Pain:
        return html`
          <wl-list-item>
            ${isSuccess
              ? `${localize('resisted')} ${localize('fleeing')}`
              : `${localize('takeNextFullActionToFlee')}`}
          </wl-list-item>
        `;

      case SpecialTest.Shock:
        return html`
          <wl-list-item clickable @click=${this.applyShock}>
            ${localize('apply')} ${localize(isSuccess ? 'some' : 'all')}
            ${localize(type)} ${localize('effects')}
          </wl-list-item>
        `;

      default:
        return html`<p>${localize(type)}</p>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-special-test': MessageSpecialTest;
  }
}
