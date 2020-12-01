import { createStressDamage, StressDamage } from '@src/combat/damages';
import {
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

@customElement('mental-health-stress-editor')
export class MentalHealthStressEditor extends LitElement {
  static get is() {
    return 'mental-health-stress-editor' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) health!: MentalHealth;

  @property({ type: Object }) stress!: StressDamage;

  @internalProperty() private editableStress!: StressDamage;

  update(changedProps: PropertyValues) {
    if (changedProps.has('stress')) {
      this.editableStress = createStressDamage(this.stress);
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
      this.editableStress.value * this.editableStress.multiplier,
    );
  }

  render() {
    const { damage } = this;
    const wounds = this.health.computeWounds(damage);
    return html`
      <div class="stress-damage">
        ${renderAutoForm({
          props: this.editableStress,
          update: (changed, orig) =>
            (this.editableStress = { ...orig, ...changed }),
          fields: ({ value, stressType }) => [
            renderNumberField(value, { min: 0 }),
            renderSelectField(stressType, enumValues(StressType)),
          ],
        })}
        <mwc-button
          dense
          label=${localize('SHORT', 'armorPiercing')}
          outlined
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
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mental-health-stress-editor': MentalHealthStressEditor;
  }
}
