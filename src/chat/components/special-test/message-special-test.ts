import type {
  SpecialTestData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { MinStressOption } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import { ConditionType } from '@src/features/conditions';
import { createEffect } from '@src/features/effects';
import { addFeature, stringID } from '@src/features/feature-helpers';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { createTag, SpecialTest } from '@src/features/tags';
import {
  createTemporaryFeature,
  TemporaryCondition,
  TemporaryFeature,
} from '@src/features/temporary';
import { CommonInterval } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { rollFormula, rollLabeledFormulas } from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import {
  grantedSuperiorResultEffects,
  isSuccessfullTestResult,
  SuccessTestResult,
} from '@src/success-test/success-test';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { compact, last, noop, prop } from 'remeda';
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

  private async applyCustomEffects() {
    const result = last(this.successTest.states)?.result;
    const checkInfo =
      this.specialTest.type === 'custom' && this.specialTest.checkInfo;
    const { actor } = this.message;
    if (!result || !checkInfo || actor?.proxy.type !== ActorType.Character)
      return;
    const { proxy } = actor;
    const isSuccess = isSuccessfullTestResult(result);
    const effects = isSuccess
      ? checkInfo.checkSuccess
      : result === SuccessTestResult.CriticalFailure &&
        notEmpty(checkInfo.criticalCheckFailure)
      ? checkInfo.criticalCheckFailure
      : checkInfo.checkFailure;

    const temporary: TemporaryFeature[] = [];
    const conditionsToAdd = new Set<ConditionType>();
    for (const effect of effects) {
      const {
        condition,
        impairment,
        staticDuration,
        variableDuration,
        variableInterval,
        additionalDurationPerSuperior,
        stress,
        notes,
        fallDown,
      } = effect;
      const isStatic = !!staticDuration || !variableDuration;
  
      let duration = CommonInterval.Turn;
      if (isStatic) duration += staticDuration || CommonInterval.Turn;
      else {
        const roll = rollFormula(variableDuration || '1d6');
        if (roll) await roll.toMessage();
        const total = roll?.total || 1;
        if (variableInterval === 'turns')
          duration += CommonInterval.Turn * total;
        else
          duration += toMilliseconds({
            [variableInterval || 'minutes']: total,
          });
      }

      if (additionalDurationPerSuperior && !isSuccess) {
        const multiples = grantedSuperiorResultEffects(result);
        duration += multiples * additionalDurationPerSuperior;
      }

      if (fallDown) conditionsToAdd.add(ConditionType.Prone);
      if (condition) {
        conditionsToAdd.add(condition);
        temporary.push(
          createTemporaryFeature.condition({
            condition,
            duration,
            name: `${this.specialTest.source} [${localize(condition)}]`,
          }),
        );
      }
      if (notes) {
        temporary.push(
          createTemporaryFeature.effects({
            effects: [
              { ...createEffect.misc({ description: notes }), id: stringID() },
            ],
            duration,
            name: this.specialTest.source,
          }),
        );
      }
      if (impairment) {
        temporary.push(
          createTemporaryFeature.effects({
            effects: [
              {
                ...createEffect.successTest({
                  modifier: impairment,
                  tags: [createTag.allActions({})],
                }),
                id: stringID(),
              },
            ],
            duration,
            name: `${this.specialTest.source} [${localize('impairment')}]`,
          }),
        );
      }
      if (stress) {
        await this.message.createSimilar({
          damage: {
            source: this.specialTest.source,
            rolledFormulas: rollLabeledFormulas([
              { label: localize('stress'), formula: stress },
            ]),
            damageType: HealthType.Mental,
          },
        });
      }
    }

    proxy.updater.batchCommits(() => {
      notEmpty(conditionsToAdd) && proxy.addConditions([...conditionsToAdd]);
      notEmpty(temporary) &&
        proxy.updater
          .path('data', 'temporary')
          .commit((temps) =>
            temporary.reduce((accum, temp) => addFeature(accum, temp), temps),
          );
    });
  }

  private get testResult() {
    return last(this.successTest.states)?.result;
  }

  render() {
    const { disabled } = this;
    const result = last(this.successTest.states)?.result;
    if (!result) return html``;

    const isSuccess = isSuccessfullTestResult(result);
    const superiorCount = grantedSuperiorResultEffects(result);
    switch (this.specialTest.type) {
      case 'custom': {
        const { checkSuccess } = this.specialTest.checkInfo;
        if (isSuccess) {
          const hasEffects = notEmpty(checkSuccess);
          return html`
            <wl-list-item
              ?disabled=${disabled}
              ?clickable=${hasEffects}
              @click=${hasEffects ? this.applyCustomEffects : noop}
            >
              ${hasEffects ? localize('partially') : ''} ${localize('resisted')}
              ${localize('custom')} ${localize('effects')}
            </wl-list-item>
          `;
        }
        return html`
          <wl-list-item clickable @click=${this.applyCustomEffects}
            >${localize('apply')} ${localize('custom')}
            ${localize('effects')}</wl-list-item
          >
        `;
      }

      case SpecialTest.Blinding:
        return html`
          <wl-list-item
            clickable
            @click=${this.applyBlinding}
            ?disabled=${disabled || isSuccess}
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
            ?disabled=${disabled || isSuccess}
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
            ?disabled=${disabled || isSuccess}
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
            ${localize(SpecialTest.Shock)} ${localize('effects')}
          </wl-list-item>
        `;

      case SpecialTest.Stun:
        return html`
          <wl-list-item
            clickable
            @click=${this.applyStun}
            ?disabled=${disabled || isSuccess}
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
            ?disabled=${disabled || isSuccess}
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
            ?disabled=${disabled || isSuccess}
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
            ?disabled=${disabled || isSuccess}
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
            ?disabled=${disabled || isSuccess}
          >
            ${isSuccess
              ? `${localize('successful')} ${localize('integration')}`
              : `${localize('apply')} ${localize('poor')} ${localize(
                  'integration',
                )} ${localize('effects')}`}
          </wl-list-item>
        `;

      case SpecialTest.ResleevingStress: {
        const { minStressOption, minSV, notes, sv } = this.specialTest.stress;
        const { stressType } = this.specialTest;
        const source = localize(SpecialTest.ResleevingStress);
        if (isSuccess) {
          if (minStressOption === MinStressOption.None)
            return html`<p>${localize('resisted')} ${source}</p>`;
          if (minStressOption === MinStressOption.Value)
            return html`<message-stress-test
              .stress=${{
                rolledFormulas: [],
                minStress: minSV,
                stressType,
                source,
                notes,
              }}
            ></message-stress-test>`;
        }
        return html`
          <wl-list-item
            clickable
            @click=${() => {
              this.message.createSimilar({
                header: { heading: source },
                stress: {
                  rolledFormulas: rollLabeledFormulas([
                    {
                      label: localize('stressValue'),
                      formula: sv,
                    },
                  ]),
                  notes,
                  source,
                  minStress:
                    minStressOption === MinStressOption.Half ? 'half' : '',
                  stressType,
                },
              });
            }}
            >${localize('roll')} ${source}</wl-list-item
          >
        `;
      }

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
        return html`<p>${localize(this.specialTest.type)}</p>`;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-special-test': MessageSpecialTest;
  }
}
