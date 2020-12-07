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
import { safeMerge, withSign } from '@src/utility/helpers';
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

  update(changedProps: PropertyValues) {
    if (changedProps.has('stress')) {
      this.editableStress = createStressDamage(
        this.stress || { damageValue: 0, formula: '' },
      );
    }
    super.update(changedProps);
  }

  private toggleArmorPiercing() {
    this.editableStress = {
      ...this.editableStress,
      armorPiercing: !this.editableStress.armorPiercing,
    };
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
    const damage = armorUsed?.appliedDamage ?? this.damage;
    const wounds = this.health.computeWounds(damage);
    return {
      damage,
      wounds,
      armorUsed: armorUsed?.personalArmorUsed
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
          armorUsed
        ),
      );
    }
  }

  render() {
    const { damage, wounds } = this.computed;
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
            renderSelectField(stressType, enumValues(StressType)),
          ],
        })}
        <mwc-button
          dense
          label=${localize('SHORT', 'armorPiercing')}
          ?outlined=${!this.editableStress.armorPiercing}
          ?unelevated=${this.editableStress.armorPiercing}
          @click=${this.toggleArmorPiercing}
        ></mwc-button>
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
