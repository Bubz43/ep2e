import type { MessageHealData } from '@src/chat/message-data';
import type { UsedRollPartsEvent } from '@src/combat/components/rolled-formulas-list/used-roll-parts-event';
import { pickOrDefaultActor } from '@src/entities/find-entities';
import { cleanFormula } from '@src/foundry/rolls';
import { HealthEditor } from '@src/health/components/health-editor/health-editor';
import { createHeal } from '@src/health/health-changes';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import styles from './message-heal.scss';

@customElement('message-heal')
export class MessageHeal extends LitElement {
  static get is() {
    return 'message-heal' as const;
  }

  static styles = [styles];

  @property({ type: Object }) heal!: MessageHealData;

  @internalProperty() private viewFormulas = false;

  @internalProperty() usedRollParts?: ReadonlySet<number>;

  toggleFormulas() {
    this.viewFormulas = !this.viewFormulas;
  }

  private setUsedRollParts(ev: UsedRollPartsEvent) {
    this.usedRollParts = ev.usedRollParts;
  }

  get rolls() {
    const { usedRollParts } = this;
    return usedRollParts
      ? this.heal.damageFormulas?.filter((_, index) =>
          usedRollParts?.has(index),
        )
      : this.heal.damageFormulas;
  }

  get damageHealTotals() {
    let damageValue = 0;
    let formula = '';
    for (const { roll } of this.rolls || []) {
      damageValue += roll.total;
      formula += formula ? `+ ${roll.formula}` : roll.formula;
    }

    formula = cleanFormula(formula);

    return { damageValue, formula };
  }

  private applyHeal() {
    const { damageValue } = this.damageHealTotals;
    const { wounds = 0, source, healthType } = this.heal;
    pickOrDefaultActor((actor) =>
      HealthEditor.openWindow({
        actor,
        adjacentEl: this,
        change: createHeal({
          damage: damageValue,
          wounds,
          source,
          type: healthType,
        }),
      }),
    );
  }

  render() {
    const { damageHealTotals } = this;
    return html`
      <div class="heal-info"></div>
      ${this.viewFormulas && this.heal.damageFormulas
        ? html`
            <rolled-formulas-list
              .rolledFormulas=${this.heal.damageFormulas}
              @used-roll-parts=${this.setUsedRollParts}
            ></rolled-formulas-list>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-heal': MessageHeal;
  }
}
