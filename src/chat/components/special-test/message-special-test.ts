import type {
  SpecialTestData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import { ConditionType } from '@src/features/conditions';
import { createEffect } from '@src/features/effects';
import { addFeature } from '@src/features/feature-helpers';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { createTag, SpecialTest } from '@src/features/tags';
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
import { customElement, html, property } from 'lit-element';
import { compact, last, prop } from 'remeda';
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
        character.addConditions(
          compact([
            ...tempConditions.map(prop('condition')),
            !isSuccess && ConditionType.Prone,
          ]),
        );
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
      actor.proxy.addConditions([ConditionType.Grappled]);
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

  private applyUnconsciousness() {
    const { actor } = this.message;
    if (actor?.proxy.type === ActorType.Character) {
      actor.proxy.addConditions([ConditionType.Unconscious]);
    }
  }

  private startBleedingOut() {
    const { actor } = this.message;
    if (actor?.proxy.type === ActorType.Character) {
      const { sleeve } = actor.proxy;
      if (sleeve?.type === ActorType.Biological)
        sleeve.physicalHealth.startBleedingOut();
    }
  }

  private applyAcuteStressResponse() {
    // TODO Roll 1d6 and have selection
  }

  private applyIntegrationEffects() {
    const { actor } = this.message;
    const { testResult } = this;
    if (actor?.proxy.type === ActorType.Character) {
      const { proxy: character } = actor;
      const poorIntegration = createTemporaryFeature.effects({
        name: `${localize('integration')} ${localize('test')} ${localize(
          'failure',
        )}`,
        effects: [],
        duration: toMilliseconds({
          days: 1 + grantedSuperiorResultEffects(testResult),
        }),
      });
      poorIntegration.effects = addFeature(
        poorIntegration.effects,
        createEffect.successTest({
          modifier: -10,
          tags: [createTag.allActions({})],
        }),
      );
      character.updater
        .path('data', 'temporary')
        .commit(addFeature(poorIntegration));
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

      case SpecialTest.PainResistance:
        return html`
          <wl-list-item>
            ${isSuccess
              ? `${localize('resisted')} ${localize('pain')}`
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

      case SpecialTest.Stun:
        return html`
          <wl-list-item
            clickable
            @click=${this.applyStun}
            ?disabled=${isSuccess}
          >
            ${isSuccess
              ? `${localize('resisted')} ${localize('stun')}`
              : `${localize('apply')} ${localize('stun')}`}
          </wl-list-item>
        `;

      case SpecialTest.Unconsciousness:
        return html`
          <wl-list-item
            clickable
            @click=${this.applyUnconsciousness}
            ?disabled=${isSuccess}
          >
            ${isSuccess
              ? `${localize('resisted')} ${localize('unconsciousness')}`
              : `${localize('apply')} ${localize('unconsciousness')}`}
          </wl-list-item>
        `;

      case SpecialTest.BleedingOut:
        return html`
          <wl-list-item
            clickable
            @click=${this.startBleedingOut}
            ?disabled=${isSuccess}
          >
            ${isSuccess
              ? `${localize('resisted')} ${localize('bleedingOut')}`
              : `${localize('start')} ${localize('bleedingOut')}`}
          </wl-list-item>
        `;

      case SpecialTest.Disorientation:
        return html`
          <wl-list-item>
            ${isSuccess
              ? `${localize('resisted')} ${localize('disorientation')}`
              : `${localize('disorientation')} - ${localize(
                  'complex',
                )} ${localize('action')} ${localize('to')} ${localize(
                  'regainWits',
                )}`}
          </wl-list-item>
        `;

      case SpecialTest.BleedingOut:
        return html`
          <wl-list-item
            clickable
            @click=${this.applyAcuteStressResponse}
            ?disabled=${isSuccess}
          >
            ${isSuccess
              ? `${localize('resisted')} ${localize('acuteStress')}, ${localize(
                  'suffer',
                )} ${localize('disorientation')}`
              : `${localize('apply')} ${localize('acuteStressResponse')}`}
          </wl-list-item>
        `;

      case SpecialTest.Integration:
        return html`
          <wl-list-item
            clickable
            @click=${this.applyIntegrationEffects}
            ?disabled=${isSuccess}
          >
            ${isSuccess
              ? `${localize('successful')} ${localize('integration')}`
              : `${localize('apply')} ${localize('poor')} ${localize(
                  'integration',
                )} ${localize('effects')}`}
          </wl-list-item>
        `;

      case SpecialTest.Addiction:
        return html`
          <wl-list-item>
            ${isSuccess
              ? `${localize('resisted')} ${localize('addiction')}`
              : `${localize('addicted')} ${localize('to')} ${
                  this.specialTest.source
                }`}
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
