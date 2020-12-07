import { createStressDamage, StressDamage } from '@src/health/health-changes';
import {
  renderFormulaField,
  renderNumberField,
  renderSelectField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { MentalHealth, StressType } from '@src/health/mental-health';
import { nonNegative, safeMerge, withSign } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
} from 'lit-element';
import styles from './mental-health-stress-editor.scss';
import { HealthModificationEvent } from '@src/health/health-modification-event';
import {
  createHealthModification,
  HealthModificationMode,
} from '@src/health/health';
import { ActiveArmor, ArmorType } from '@src/features/active-armor';
import { rollFormula } from '@src/foundry/rolls';
import { set } from 'remeda';

/**
 * @fires health-modification - HealthModificationEvent
 */
@customElement('mental-health-stress-editor')
export class MentalHealthStressEditor extends LitElement {
  static get is() {
    return 'mental-health-stress-editor' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) health!: MentalHealth;

  @property({ type: Object }) stress?: StressDamage | null;

  @property({ attribute: false }) armor?: ActiveArmor | null;

  @internalProperty() private editableStress!: StressDamage;

  @internalProperty() private overrides?: Partial<{
    takeMinimum: boolean;
    damage: number;
    wounds: number;
  }>;

  update(changedProps: PropertyValues) {
    if (changedProps.has('stress')) {
      this.editableStress = createStressDamage(
        this.stress || { damageValue: 0, formula: '' },
      );
      this.overrides = {};
    }
    super.update(changedProps);
  }

  private toggleArmorPiercing() {
    this.editableStress = {
      ...this.editableStress,
      armorPiercing: !this.editableStress.armorPiercing,
    };
  }

  private toggleArmorReduce() {
    this.editableStress = {
      ...this.editableStress,
      reduceAVbyDV: !this.editableStress.reduceAVbyDV,
    };
  }

  private toggleTakeMinimum() {
    this.overrides = set(
      this.overrides || {},
      'takeMinimum',
      !this.overrides?.takeMinimum,
    );
  }

  private toggleUsedArmor(armor: ArmorType) {
    const used = new Set(this.editableStress.armorUsed);
    if (used.has(armor)) used.delete(armor);
    else used.add(armor);
    this.editableStress = {
      ...this.editableStress,
      armorUsed: [...used],
    };
  }

  private get damage() {
    return Math.ceil(
      this.editableStress.damageValue * this.editableStress.multiplier,
    );
  }

  private get computed() {
    const armorUsed = this.armor?.mitigateDamage({
      damage: this.damage,
      armorPiercing: this.editableStress.armorPiercing,
      armorUsed: this.editableStress.armorUsed,
    });
    let damage = armorUsed?.appliedDamage ?? this.damage;

    const roll = rollFormula(this.editableStress.formula);
    const max = nonNegative(
      (roll?.terms || []).reduce<number>((accum, term, index, list) => {
        if (term instanceof DiceTerm) accum += term.number;
        else if (typeof term === 'number' && list[index - 1] === '+')
          accum += term;
        return accum;
      }, 0),
    );

    if (this.overrides?.takeMinimum) damage = Math.min(max, damage);

    const wounds = this.health.computeWounds(damage);

    return {
      damage,
      wounds,
      armorUsed: armorUsed?.personalArmorUsed,
      minimumDV: max,
    };
  }

  private emitChange() {
    if (this.editableStress.damageValue) {
      const { damage, wounds, armorUsed } = this.computed;
      this.dispatchEvent(
        new HealthModificationEvent(
          createHealthModification({
            mode: HealthModificationMode.Inflict,
            damage,
            wounds,
            source: this.stress?.source || localize('editor'),
          }),
          armorUsed,
        ),
      );
    }
  }

  render() {
    const { damage, wounds, minimumDV } = this.computed;

    return html`
      <div class="stress-damage">
        ${renderAutoForm({
          classes: 'stress-form',
          props: this.editableStress,
          noDebounce: true,
          update: (changed, orig) =>
            (this.editableStress = { ...orig, ...changed }),
          fields: ({ damageValue, stressType, formula }) => [
            renderFormulaField(formula),
            renderNumberField(
              { ...damageValue, label: localize('stress') },
              { min: 0 },
            ),
            // renderSelectField(stressType, enumValues(StressType)),
          ],
        })}
        <div class="armor-toggles">
          <mwc-button
            dense
            label=${localize('armorPiercing')}
            ?outlined=${!this.editableStress.armorPiercing}
            ?unelevated=${this.editableStress.armorPiercing}
            @click=${this.toggleArmorPiercing}
          ></mwc-button>
          <mwc-button
            ?outlined=${!this.editableStress.reduceAVbyDV}
            ?unelevated=${this.editableStress.reduceAVbyDV}
            dense
            label=${localize('reduceAVbyDV')}
            @click=${this.toggleArmorReduce}
          ></mwc-button>
        </div>
      </div>

      ${this.armor
        ? html`
            <div class="armors">
              ${enumValues(ArmorType).map((armor) => {
                const active = this.editableStress.armorUsed.includes(armor);
                return html`
                  <wl-list-item
                    clickable
                    @click=${() => this.toggleUsedArmor(armor)}
                    class="armor ${active ? 'active' : ''}"
                    >${localize(armor)}:
                    ${this.armor?.getClamped(armor)}</wl-list-item
                  >
                `;
              })}
            </div>
          `
        : ''}

      <wl-list-item
        clickable
        @click=${this.toggleTakeMinimum}
        role="button"
        class="min-toggle ${this.overrides?.takeMinimum ? 'active' : ''}"
        ><span>${localize('take')} ${localize('minimum')} ${localize("damage")}: ${Math.min(minimumDV, damage)}</span>
      </wl-list-item>

      <div class="change">
        <sl-group label=${localize('stress')}>${withSign(damage)}</sl-group>
        ${this.health.wound
          ? html`
              <sl-group label=${localize('traumas')}
                >${withSign(wounds)}</sl-group
              >
            `
          : ''}
      </div>

      <submit-button
        label=${localize('inflict')}
        ?complete=${!!this.editableStress.damageValue}
        @submit-attempt=${this.emitChange}
      ></submit-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mental-health-stress-editor': MentalHealthStressEditor;
  }
}
