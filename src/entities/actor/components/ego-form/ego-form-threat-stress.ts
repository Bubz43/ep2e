import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderNumberInput,
  renderRadioFields,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import { enumValues, MinStressOption } from '@src/data-enums';
import type { UpdateActions } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import type { Ego } from '../../ego';
import styles from './ego-form-threat-stress.scss';

@customElement('ego-form-threat-stress')
export class EgoFormThreatStress extends LitElement {
  static get is() {
    return 'ego-form-threat-stress' as const;
  }

  static styles = [styles];

  @property({
    attribute: false,
    hasChanged() {
      return true;
    },
  })
  updateOps!: UpdateActions<Ego['stressTestValue']>;

  @property({ type: Boolean }) disabled = false;

  render() {
    return html`
      ${renderUpdaterForm(this.updateOps, {
        disabled: this.disabled,
        classes: 'main-form',
        fields: ({ sv, notes }) => [
          renderFormulaField({
            ...sv,
            label: localize('stressValue'),
          }),
          renderTextField({
            ...notes,
            label: `${localize('stress')} ${notes.label}`,
          }),
        ],
      })}
      ${this.updateOps.originalValue().sv
        ? html`
            ${renderUpdaterForm(this.updateOps, {
              disabled: this.disabled,
              classes: 'min-form',
              fields: ({ minStressOption, minSV }) => html`
                <span
                  >${localize('minimumStress')}
                  ${renderRadioFields(
                    minStressOption,
                    enumValues(MinStressOption),
                  )}</span
                >
                ${renderNumberInput(minSV, {
                  min: 1,
                  disabled: minStressOption.value !== MinStressOption.Value,
                })}
              `,
            })}
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form-threat-stress': EgoFormThreatStress;
  }
}
