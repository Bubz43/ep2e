import type { MessageHealData } from '@src/chat/message-data';
import type { UsedRollPartsEvent } from '@src/combat/components/rolled-formulas-list/used-roll-parts-event';
import { pickOrDefaultActor } from '@src/entities/find-entities';
import { localize } from '@src/foundry/localization';
import { cleanFormula } from '@src/foundry/rolls';
import { HealthEditor } from '@src/health/components/health-editor/health-editor';
import { HealthType } from '@src/health/health';
import { createHeal } from '@src/health/health-changes';
import { notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import {
  customElement,


  html,
  internalProperty, LitElement,
  property
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

  private get labels(): [string, string] {
    switch (this.heal.healthType) {
      case HealthType.Mental:
        return [localize('stress'), localize('traumas')];
      case HealthType.Physical:
      case HealthType.Mesh:
        return [localize('damage'), localize('wounds')];
    }
  }

  render() {
    const { damageHealTotals, heal, labels } = this;
    const [damageLabel, woundLabel] = labels;
    const hasFormulas = notEmpty(this.heal.damageFormulas);
    return html`
      <mwc-button dense unelevated class="heal-values" @click=${this.applyHeal}>
        ${damageHealTotals.damageValue || 0} ${damageLabel}, ${heal.wounds || 0}
        ${woundLabel}
      </mwc-button>
      ${hasFormulas
        ? html` <mwc-icon-button
        class="formulas-toggle"
        @click=${this.toggleFormulas}
        icon=${this.viewFormulas ? "keyboard_arrow_down" : "keyboard_arrow_left"}
      >

      </mwc-icon-button>`
        : ''}
      <div class="heal-info">
        ${damageHealTotals.formula || hasFormulas
          ? ` ${localize('recover')} ${damageHealTotals.formula} ${localize(
              this.heal.healthType,
            )} ${damageLabel}`
          : localize(`${this.heal.healthType}Health` as const)}
      </div>

      ${this.viewFormulas && heal.damageFormulas
        ? html`
            <rolled-formulas-list
              .rolledFormulas=${heal.damageFormulas}
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
