import type { StressTestMessageData } from '@src/chat/message-data';
import type { UsedRollPartsEvent } from '@src/combat/components/rolled-formulas-list/used-roll-parts-event';
import { createStressDamage, StressDamage } from '@src/health/health-changes';
import { pickOrDefaultActor } from '@src/entities/find-entities';
import { localize } from '@src/foundry/localization';
import { cleanFormula } from '@src/foundry/rolls';
import { HealthEditor } from '@src/health/components/health-editor/health-editor';
import { formatDamageType, HealthType } from '@src/health/health';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from 'lit-element';
import styles from './message-stress-test.scss';

@customElement('message-stress-test')
export class MessageStressTest extends LitElement {
  static get is() {
    return 'message-stress-test' as const;
  }

  static styles = [styles];

  @property({ type: Object }) stress!: StressTestMessageData;

  @internalProperty() private viewFormulas = false;

  @internalProperty() private usedRollParts?: ReadonlySet<number>;

  toggleFormulas() {
    this.viewFormulas = !this.viewFormulas;
  }

  private setUsedRollParts(ev: UsedRollPartsEvent) {
    this.usedRollParts = ev.usedRollParts;
  }

  get rolls() {
    const { usedRollParts } = this;
    console.log(this.usedRollParts);
    return usedRollParts
      ? this.stress.rolledFormulas.filter((_, index) =>
          usedRollParts?.has(index),
        )
      : this.stress.rolledFormulas;
  }

  get totals() {
    let damageValue = 0;
    let formula = '';
    for (const { roll } of this.rolls) {
      damageValue += roll.total;
      formula += formula ? `+ ${roll.formula}` : roll.formula;
    }

    formula = cleanFormula(formula);

    return { damageValue, formula };
  }

  private get minStress() {
    const { damageValue, formula } = this.totals;
    const { minStress } = this.stress;
    if (!minStress) return { damageValue, formula };
    if (minStress === 'half') {
      // TODO better indication that min sv is halved
      return {
        formula: formula && cleanFormula(`(${formula}) / 2`),
        damageValue: Math.ceil(damageValue / 2),
      };
    }

    return {
      formula: String(minStress),
      damageValue: minStress,
    };
  }

  private get source() {
    return this.stress.source || localize('stressfulExperience');
  }

  private applyDamage() {
    this.openHealthPicker(
      createStressDamage({
        source: this.source,
        stressType: this.stress.stressType,
        ...this.totals,
      }),
    );
  }

  private applyMinDamage() {
    this.openHealthPicker(
      createStressDamage({
        source: this.source,
        stressType: this.stress.stressType,
        ...this.minStress,
      }),
    );
  }

  private openHealthPicker(damage: StressDamage) {
    pickOrDefaultActor((actor) =>
      HealthEditor.openWindow({ actor, adjacentEl: this, change: damage }),
    );
  }

  render() {
    const { totals } = this;
    const { minStress, stressType, notes } = this.stress;
    return html`
      <mwc-button
        dense
        unelevated
        class="stress-value"
        @click=${this.applyDamage}
      >
        ${formatDamageType(HealthType.Mental)}: ${totals.damageValue}
      </mwc-button>

      ${minStress
        ? html`
            <mwc-button dense unelevated class="min-stress-value" @click=${
              this.applyMinDamage
            }
              >${localize('minSV')}: ${
            this.minStress.damageValue
          }</mwc-button dense unelevated
            >
          `
        : ''}
      ${notEmpty(this.stress.rolledFormulas)
        ? html` <mwc-icon-button
            class="formulas-toggle"
            @click=${this.toggleFormulas}
            icon=${this.viewFormulas
              ? 'keyboard_arrow_down'
              : 'keyboard_arrow_left'}
          >
          </mwc-icon-button>`
        : ''}

      <div class="damage-info">
        ${totals.formula} ${localize('stress')}
        ${stressType
          ? `${localize('from').toLocaleLowerCase()} ${localize(stressType)}`
          : ''}.
        ${notes ? html`<div>${notes}</div>` : ''}
      </div>

      ${this.viewFormulas
        ? html`
            <rolled-formulas-list
              .rolledFormulas=${this.stress.rolledFormulas}
              @used-roll-parts=${this.setUsedRollParts}
            ></rolled-formulas-list>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-stress-test': MessageStressTest;
  }
}
