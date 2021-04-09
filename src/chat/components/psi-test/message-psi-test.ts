import { createMessage, rollModeToVisibility } from '@src/chat/create-message';
import type {
  PsiTestData,
  SuccessTestMessageData,
} from '@src/chat/message-data';
import { AptitudeType, PsiPush, SleightDuration } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { Sleight } from '@src/entities/item/proxies/sleight';
import { createEffect, multiplyEffectModifier } from '@src/features/effects';
import { uniqueStringID } from '@src/features/feature-helpers';
import { createTemporaryFeature } from '@src/features/temporary';
import { localize } from '@src/foundry/localization';
import {
  joinLabeledFormulas,
  rollFormula,
  rollLabeledFormulas,
} from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { AptitudeCheckControls } from '@src/success-test/components/aptitude-check-controls/aptitude-check-controls';
import { InfectionTestControls } from '@src/success-test/components/infection-test-controls/infection-test-controls';
import {
  grantedSuperiorResultEffects,
  SuccessTestResult,
} from '@src/success-test/success-test';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { compact, last, range } from 'remeda';
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

  private get sleight() {
    return new Sleight({
      data: this.psiTest.sleight,
      embedded: null,
    });
  }

  private get pushes() {
    return compact([this.psiTest.freePush, this.psiTest.push]);
  }

  private get successTestInfo() {
    const test = this.successTest;
    const result = last(test.states || [])?.result;

    return result && test
      ? {
          result,
          superiorEffects: test.superiorResultEffects,
        }
      : null;
  }

  private get halveResistance() {
    return this.pushes.includes(PsiPush.IncreasedPower);
  }

  private startDefense() {
    pickOrDefaultCharacter((character) => {
      AptitudeCheckControls.openWindow({
        entities: { actor: character.actor },
        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;

          return {
            ego: actor.proxy.ego,
            character: actor.proxy,
            aptitude: AptitudeType.Willpower,
            halve: this.halveResistance,
          };
        },
      });
    });
  }

  private startInfectionTest() {
    const { actor, token } = this.message;
    if (actor?.proxy.type !== ActorType.Character) return;

    InfectionTestControls.openWindow({
      entities: { actor },
      relativeEl: this,
      getState: (actor) => {
        if (actor.proxy.type === ActorType.Character && actor.proxy.psi) {
          return {
            character: actor.proxy,
            psi: actor.proxy.psi,
            token,
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

  private applyEffectsToTarget() {
    pickOrDefaultCharacter(async (character) => {
      const { sleight, pushes, successTestInfo } = this;
      const { effects, scaleEffectsOnSuperior, mentalArmor } = sleight.toTarget;
      const totalDuration = sleight.getTotalDuration(
        this.psiTest.willpower,
        pushes.includes(PsiPush.IncreasedDuration),
      );
      const superiorSuccesses = grantedSuperiorResultEffects(
        successTestInfo?.result,
      );

      let effectMultipliers = 1;
      if (pushes.includes(PsiPush.IncreasedEffect)) effectMultipliers++;

      if (successTestInfo?.result === SuccessTestResult.CriticalSuccess) {
        effectMultipliers++;
      }

      if (scaleEffectsOnSuperior) {
        effectMultipliers += superiorSuccesses;
      }

      const finalEffects = effects.map((effect) =>
        multiplyEffectModifier(effect, effectMultipliers),
      );

      if (mentalArmor.apply) {
        const roll = rollFormula(
          joinLabeledFormulas(
            compact([
              { label: localize('base'), formula: mentalArmor.formula },
              ...range(0, effectMultipliers - 1).map(() => ({
                label: '',
                formula: mentalArmor.formula,
              })),
            ]),
          ),
        );
        if (roll) {
          await createMessage({
            roll,
            flavor: localize('mentalArmor'),
            visibility: rollModeToVisibility(
              game.settings.get('core', 'rollMode'),
            ),
          });
          finalEffects.push({
            ...createEffect.armor({
              mental: roll.total,
              concealable: true,
              layerable: true,
            }),
            id: uniqueStringID(finalEffects.map((e) => e.id)),
          });
        }
      }

      const temporaryFeatureId = uniqueStringID(
        character.epData.temporary.map((temp) => temp.id),
      );

      await character.updater.path('data', 'temporary').commit((temps) => [
        ...temps,
        {
          ...createTemporaryFeature.effects({
            effects: finalEffects,
            duration: totalDuration,
            name: sleight.name,
          }),
          id: temporaryFeatureId,
        },
      ]);

      this.getUpdater('psiTest').commit({
        appliedTo: [
          ...(this.psiTest.appliedTo || []),
          {
            ...character.actor.tokenOrLocalInfo,
            temporaryFeatureId,
          },
        ],
      });
    });
  }

  private startSustaining() {
    // TODO Check to make sure every one has applied it
    const { actor } = this.message;
    if (actor?.proxy.type === ActorType.Character) {
      actor.proxy.activatedSleights
        .find((s) => s.id === this.psiTest.sleight._id)
        ?.startSustaining(this.psiTest.appliedTo || []);
    }
  }

  private removeAppliedTo(ev: Event) {
    if (this.disabled || !this.psiTest.appliedTo) return;
    const index = Number((ev.currentTarget as HTMLElement).dataset['index']);
    const newList = [...this.psiTest.appliedTo];
    newList.splice(index, 1);
    this.getUpdater('psiTest').commit({ appliedTo: newList });
  }

  render() {
    const { disabled, successTestInfo, psiTest, halveResistance } = this;
    const { toSelf, toTarget, duration } = this.sleight;
    const { appliedTo } = psiTest;
    return html`
      <sl-group label=${localize('opposeWith')} class="defense">
        <wl-list-item clickable @click=${this.startDefense}>
          ${localize(AptitudeType.Willpower)} ${halveResistance ? ` ÷ 2` : ''}
        </wl-list-item>
      </sl-group>

      ${toTarget.effects.length
        ? html`
            <mwc-button class="apply-effects"
              >${localize('applyEffects')}</mwc-button
            >
          `
        : ''}
      ${notEmpty(appliedTo) ? this.renderAppliedTo(appliedTo) : ''}
      ${disabled
        ? ''
        : html`
            ${duration === SleightDuration.Sustained
              ? html`
                  <mwc-button @click=${this.startSustaining}
                    >${localize('start')} ${localize('sustaining')}</mwc-button
                  >
                `
              : ''}
            ${successTestInfo?.result === SuccessTestResult.CriticalFailure
              ? html`
                  <mwc-button
                    dense
                    outlined
                    @click=${this.rollCriticalFailureDamage}
                  >
                    ${localize(successTestInfo.result)} - ${localize('roll')}
                    ${localize('SHORT', 'damageValue')} 1d6
                  </mwc-button>
                `
              : ''}
            ${psiTest.push && !psiTest.sideEffectNegation
              ? html`
                  <mwc-button dense outlined @click=${this.rollPushDamage}>
                    ${localize('pushed')} - ${localize('roll')}
                    ${localize('SHORT', 'damageValue')} 1d6
                  </mwc-button>
                `
              : ''}
            ${psiTest.variableInfection && psiTest.sideEffectNegation !== 'all'
              ? html`
                  <mwc-button
                    dense
                    outlined
                    @click=${this.startInfectionTest}
                    class="infection-test"
                  >
                    ${localize('infectionTest')}
                  </mwc-button>
                `
              : ''}
          `}
    `;
  }

  private renderAppliedTo(entities: { name: string; uuid: string }[]) {
    const { disabled } = this;
    return html`
      <sl-group label="${localize('applied')} ${localize('to')}"
        >${entities.map(
          ({ name }, index, list) => html`
            <wl-list-item
              class="applied-to"
              ?clickable=${!disabled}
              data-index=${index}
              @click=${this.removeAppliedTo}
            >
              ${name}${index < list.length - 1 ? ',' : ''}
              ${disabled ? '' : html` <mwc-icon>clear</mwc-icon> `}
            </wl-list-item>
          `,
        )}</sl-group
      >
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-psi-test': MessagePsiTest;
  }
}
