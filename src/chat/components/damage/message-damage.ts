import type { DamageMessageData } from '@src/chat/message-data';
import { formatArmorUsed } from '@src/combat/attack-formatting';
import type { UsedRollPartsEvent } from '@src/combat/components/rolled-formulas-list/used-roll-parts-event';
import { renderAutoForm } from '@src/components/form/forms';
import { pickOrDefaultActor } from '@src/entities/find-entities';
import { localize } from '@src/foundry/localization';
import { cleanFormula } from '@src/foundry/rolls';
import { HealthEditor } from '@src/health/components/health-editor/health-editor';
import {
  formatDamageType,
  formatFormulaWithMultiplier,
  HealthType,
} from '@src/health/health';
import {
  createMeshDamage,
  createPhysicalDamage,
  createStressDamage,
  RollMultiplier,
} from '@src/health/health-changes';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { omit } from 'remeda';
import styles from './message-damage.scss';

@customElement('message-damage')
export class MessageDamage extends LitElement {
  static get is() {
    return 'message-damage' as const;
  }

  static styles = [styles];

  @property({ type: Object }) damage!: DamageMessageData;

  @internalProperty() private viewFormulas = false;

  @internalProperty() usedRollParts?: ReadonlySet<number>;

  @internalProperty() multiplier: RollMultiplier = 1;

  update(changedProps: PropertyValues) {
    if (changedProps.has('damage')) {
      this.multiplier = this.damage.multiplier ?? 1;
    }
    super.update(changedProps);
  }

  toggleFormulas() {
    this.viewFormulas = !this.viewFormulas;
  }

  private setUsedRollParts(ev: UsedRollPartsEvent) {
    this.usedRollParts = ev.usedRollParts;
  }

  private applyDamage() {
    const data = {
      ...this.totals,
      ...omit(this.damage, ['rolledFormulas']),
      multiplier: this.multiplier,
    };
    pickOrDefaultActor((actor) =>
      HealthEditor.openWindow({
        actor,
        adjacentEl: this,
        change:
          this.damage.damageType === HealthType.Physical
            ? createPhysicalDamage(data)
            : this.damage.damageType === HealthType.Mental
            ? createStressDamage(data)
            : createMeshDamage(data),
      }),
    );
  }

  get rolls() {
    const { usedRollParts } = this;
    return usedRollParts
      ? this.damage.rolledFormulas.filter((_, index) =>
          usedRollParts?.has(index),
        )
      : this.damage.rolledFormulas;
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

  render() {
    const { totals, multiplier } = this;
    const { damageType } = this.damage;

    return html`
      <mwc-button
        dense
        unelevated
        class="damage-value"
        @click=${this.applyDamage}
      >
        ${formatDamageType(damageType)}:
        ${Math.ceil(totals.damageValue * multiplier)}
      </mwc-button>

      ${notEmpty(this.damage.rolledFormulas)
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
        ${formatFormulaWithMultiplier(totals.formula, multiplier)}
        ${localize(damageType)}
        ${localize(damageType === HealthType.Mental ? 'stress' : 'damage')}
      </div>
      <div class="armor-info">${formatArmorUsed(this.damage)}</div>

      ${this.viewFormulas
        ? html`
            ${renderAutoForm({
              props: { multiplier: String(this.multiplier) },
              update: ({ multiplier }) =>
                (this.multiplier = (Number(multiplier) || 1) as RollMultiplier),
              fields: ({ multiplier }) => html`
                <div class="multiplier">
                  <span>${localize('multiplier')}</span>
                  <div class="radios">
                    ${[0.5, 1, 2]
                      .map(String)
                      .map(
                        (mp) => html`
                          <mwc-formfield label=${mp}>
                            <mwc-radio
                              name=${multiplier.prop}
                              value=${mp}
                              ?checked=${mp === multiplier.value}
                            ></mwc-radio
                          ></mwc-formfield>
                        `,
                      )}
                  </div>
                </div>
              `,
            })}
            <rolled-formulas-list
              .rolledFormulas=${this.damage.rolledFormulas}
              @used-roll-parts=${this.setUsedRollParts}
            ></rolled-formulas-list>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-damage': MessageDamage;
  }
}
