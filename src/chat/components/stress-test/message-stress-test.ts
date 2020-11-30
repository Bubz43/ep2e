import type { MultiSelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import type { StressTestMessageData } from '@src/chat/message-data';
import { format, localize } from '@src/foundry/localization';
import { cleanFormula, RollData } from '@src/foundry/rolls';
import { formatDamageType, HealthType } from '@src/health/health';
import { overlay, tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
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

  private setIgnored(ev: MultiSelectedEvent) {
    this.usedRollParts = ev.detail.index;
    this.requestUpdate();
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
      <mwc-button dense unelevated class="stress-value">
        ${formatDamageType(HealthType.Mental)}: ${totals.damageValue}
      </mwc-button>

      ${minStress
        ? html`
            <mwc-button dense unelevated class="min-stress-value"
              >   ${localize('minSV')}:  ${
            minStress === 'half' ? Math.ceil(totals.damageValue / 2) : minStress
          }</mwc-button dense unelevated
            >
          `
        : ''}
      ${notEmpty(this.stress.rolledFormulas)
      ? html` <mwc-button
        dense
            class="formulas-toggle"
            @click=${this.toggleFormulas}
          >
            <img src=${localImage('icons/cubes.svg')} height="20px" />
          </mwc-button>`
      : ''}

      <div class="damage-info">
        ${totals.formula} ${localize("stress")} ${localize("from")} ${localize(stressType)}.
        ${notes ? html`<div>${notes}</div>` : ""}
      </div>
        
        ${this.viewFormulas ? this.renderRolls() : ""}
    `;
  }

  private renderRolls() {
    return html`
      <mwc-list class="rolls" @selected=${this.setIgnored} multi>
        <li divider></li>
        ${this.stress.rolledFormulas.map(
          ({ label, roll }, index) => html`
            <mwc-check-list-item
              @mouseover=${this.rollTooltip(roll)}
              ?selected=${!this.usedRollParts || this.usedRollParts.has(index)}
            >
              <span class="roll-info">
                <b>${roll.total}</b>
                <span>
                  <span class="roll-formula" title=${roll.formula}
                    >${roll.formula}</span
                  >
                  <span class="roll-label" title=${label}>${label}</span>
                </span>
              </span>
            </mwc-check-list-item>
          `,
        )}
      </mwc-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-stress-test': MessageStressTest;
  }
}
