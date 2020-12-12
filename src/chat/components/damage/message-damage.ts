import type { DamageMessageData } from '@src/chat/message-data';
import type { UsedRollPartsEvent } from '@src/combat/components/rolled-formulas-list/used-roll-parts-event';
import { pickOrDefaultActor } from '@src/entities/find-entities';
import { localize } from '@src/foundry/localization';
import { cleanFormula } from '@src/foundry/rolls';
import { HealthEditor } from '@src/health/components/health-editor/health-editor';
import { formatDamageType, HealthType } from '@src/health/health';
import {
  createMeshDamage,
  createPhysicalDamage,
} from '@src/health/health-changes';
import { notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
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

  toggleFormulas() {
    this.viewFormulas = !this.viewFormulas;
  }

  private setUsedRollParts(ev: UsedRollPartsEvent) {
    this.usedRollParts = ev.usedRollParts;
  }

  private applyDamage() {
    const data = { ...this.totals, source: this.damage.source };
    pickOrDefaultActor((actor) =>
      HealthEditor.openWindow({
        actor,
        adjacentEl: this,
        change:
          this.damage.damageType === HealthType.Physical
            ? createPhysicalDamage(data)
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
    const { totals } = this;
    const { damageType } = this.damage;
    return html`
      <mwc-button
        dense
        unelevated
        class="stress-value"
        @click=${this.applyDamage}
      >
        ${formatDamageType(damageType)}: ${totals.damageValue}
      </mwc-button>

      ${notEmpty(this.damage.rolledFormulas)
        ? html` <mwc-button
            dense
            class="formulas-toggle"
            @click=${this.toggleFormulas}
          >
            <img src=${localImage('icons/cubes.svg')} height="20px" />
          </mwc-button>`
        : ''}

      <div class="damage-info">
        ${totals.formula} ${localize(damageType)} ${localize('damage')}
      </div>

      ${this.viewFormulas
        ? html`
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
