import type { StressTestMessageData } from '@src/chat/message-data';
import { cleanFormula, RollData } from '@src/foundry/rolls';
import { formatDamageType, HealthType } from '@src/health/health';
import { overlay, tooltip } from '@src/init';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import styles from './message-stress-test.scss';

@customElement('message-stress-test')
export class MessageStressTest extends LitElement {
  static get is() {
    return 'message-stress-test' as const;
  }

  static styles = [styles];

  @property({ type: Object }) stress!: StressTestMessageData;

  @internalProperty() private viewFormulas = false;

  private usedRollParts?: Set<number>;

  toggleFormulas() {
    this.viewFormulas = !this.viewFormulas;
  }

  get rolls() {
    const { usedRollParts } = this;
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

  private rollTooltip(data: RollData) {
    return async ({ currentTarget }: MouseEvent) => {
      tooltip.attach({
        el: currentTarget as HTMLElement,
        content: html`${unsafeHTML(
          (await Roll.fromData(data).getTooltip()) as string,
        )}`,
        position: 'left-start',
      });
    };
  }

  render() {
    const { rolls, totals } = this;
    const { minStress, stressType, notes } = this.stress;
    return html`
      <mwc-button dense>
      ${formatDamageType(HealthType.Mental)} ${totals.damageValue}
      </mwc-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-stress-test': MessageStressTest;
  }
}
