import {
  renderFormulaField,
  renderNumberField,
  renderRadioFields,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import {
  renderAutoForm,
  renderSubmitForm,
  renderUpdaterForm,
} from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { enumValues, RechargeType } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { addFeature, StringID } from '@src/features/feature-helpers';
import {
  ActiveRecharge,
  createTemporaryFeature,
} from '@src/features/temporary';
import { CommonInterval, currentWorldTimeMS } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { rollFormula } from '@src/foundry/rolls';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from 'lit-element';
import mix from 'mix-with/lib';
import styles from './character-view-recharge.scss';

@customElement('character-view-recharge')
export class CharacterViewRecharge extends mix(LitElement).with(UseWorldTime) {
  static get is() {
    return 'character-view-recharge' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @internalProperty() rechargeType = RechargeType.Short;

  render() {
    const { disabled, pools, updater, activeRecharge } = this.character;
    return html`
      <character-view-drawer-heading
        >${localize('recharge')}</character-view-drawer-heading
      >
      ${activeRecharge
        ? this.renderRechargeCompletion(activeRecharge)
        : html`
            <div class="recharge-init">
              ${renderAutoForm({
                props: { recharge: this.rechargeType },
                update: ({ recharge }) => {
                  if (recharge) this.rechargeType = recharge;
                },
                fields: ({ recharge }) =>
                  renderRadioFields(recharge, enumValues(RechargeType)),
              })}
              ${this.renderRechargeForm()}
            </div>
          `}
      ${notEmpty(pools)
        ? html`<fieldset>
            <legend>
              ${localize('spentPools')}
              <span class="total-spent"
                >${this.character.pools.totalSpent}</span
              >
            </legend>
            ${renderUpdaterForm(updater.prop('data', 'spentPools'), {
              disabled,
              fields: (spent) =>
                [...pools].map(([pool, { max }]) =>
                  renderNumberField(spent[pool], { min: 0, max }),
                ),
            })}
          </fieldset>`
        : ''}
      ${enumValues(RechargeType).map(this.renderRechargeFields)}
    `;
  }

  private renderRechargeFields = (type: RechargeType) => {
    const recharge = this.character.recharges[type];
    const { timer, taken, max } = recharge;
    return html`
      <fieldset class="recharge-field">
        <legend>${localize(type)}</legend>
        ${renderAutoForm({
          disabled: this.character.disabled,
          props: { taken, refreshIn: timer.remaining },
          update: ({ taken, refreshIn }) => {
            this.character.updater.prop('data', type).commit({
              taken,
              refreshTimer:
                typeof refreshIn === 'number'
                  ? currentWorldTimeMS() - (CommonInterval.Day - refreshIn)
                  : undefined,
            });
          },
          fields: ({ taken, refreshIn }) => [
            renderNumberField(taken, {
              min: 0,
              max,
            }),
            taken.value
              ? renderTimeField(refreshIn, {
                  min: 0,
                  max: CommonInterval.Day,
                })
              : '',
          ],
        })}
      </fieldset>
    `;
  };

  private renderRechargeCompletion(activeRecharge: StringID<ActiveRecharge>) {
    return html`
      <character-view-recharge-completion
        .activeRecharge=${activeRecharge}
        .character=${this.character}
      ></character-view-recharge-completion>
    `;
  }

  private renderRechargeForm() {
    const recharge = this.character.recharges[this.rechargeType];
    return renderSubmitForm({
      submitEmpty: true,
      submitButtonText: localize('start'),
      props: recharge.startInfo,
      update: async (changed, original) => {
        const { timeframe, formula } = { ...original, ...changed };
        const regainedPoints = rollFormula(formula).total || 0;
        await this.character.updater.prop('data', 'temporary').commit(
          addFeature(
            createTemporaryFeature.activeRecharge({
              rechargeType: recharge.type,
              regainedPoints,
              duration: timeframe,
            }),
          ),
        );
        if (timeframe === 0) {
          await this.requestUpdate();
          requestAnimationFrame(() => {
            this.renderRoot
              .querySelector<HTMLElement>('.active-recharge')
              ?.click();
          });
        }
      },
      fields: ({ timeframe, formula }) => [
        renderTimeField(timeframe, { whenZero: localize('instant') }),
        recharge.type === RechargeType.Short
          ? renderFormulaField({
              ...formula,
              label: localize('poolsRegained'),
            })
          : html`<p>${localize('regainAllPools')}</p>`,
      ],
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-recharge': CharacterViewRecharge;
  }
}
