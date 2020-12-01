import type { MultiSelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import type { RollData, RolledFormula } from '@src/foundry/rolls';
import { tooltip } from '@src/init';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import styles from './rolled-formulas-list.scss';
import { UsedRollPartsEvent } from './used-roll-parts-event';

/**
 * @fires used-roll-parts
 */
@customElement('rolled-formulas-list')
export class RolledFormulasList extends LitElement {
  static get is() {
    return 'rolled-formulas-list' as const;
  }

  static styles = [styles];

  @property({ type: Array }) rolledFormulas: RolledFormula[] = [];

  @internalProperty() private usedRollParts?: Set<number>;

  private setUsed(ev: MultiSelectedEvent) {
    this.usedRollParts = new Set(ev.detail.index);
    this.dispatchEvent(new UsedRollPartsEvent(new Set(this.usedRollParts)));
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
    return html`
      <mwc-list class="rolls" @selected=${this.setUsed} multi>
        <li divider></li>
        ${this.rolledFormulas.map(
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
    'rolled-formulas-list': RolledFormulasList;
  }
}
