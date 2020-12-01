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
import { createHealthModification, HealthModificationMode } from '@src/health/health';

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

  private get damage() {
    return Math.ceil(
      this.editableStress.damageValue * this.editableStress.multiplier,
    );
  }

  private emitChange() {
    if (this.editableStress.damageValue) {
      this.dispatchEvent(new HealthModificationEvent(createHealthModification({
        mode: HealthModificationMode.Inflict,
        damage: this.damage,
        wounds: this.health.computeWounds(this.damage),
        source: this.stress?.source || localize("editor"),
      })))
    }
  }

  render() {
    const { damage } = this;
    const wounds = this.health.computeWounds(damage);
    // TODO Armor
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
