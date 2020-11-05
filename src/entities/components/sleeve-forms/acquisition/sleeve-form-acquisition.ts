import {
  renderSelectField,
  renderLabeledCheckbox,
  renderNumberField,
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { enumValues, MorphCost, Complexity } from '@src/data-enums';
import type { UpdateActions } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import type { AcquisitionData } from '@src/foundry/template-schema';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { customElement, LitElement, property, html } from 'lit-element';
import { renderMorphAcquisition } from '../../sleeve-acquisition';
import styles from './sleeve-form-acquisition.scss';

const renderAcquisitionFields: FieldPropsRenderer<AcquisitionData> = ({
  cost,
  availability,
  complexity,
  restricted,
  resource,
}) => {
  const templates = [
    renderSelectField(resource, enumValues(MorphCost), {
      emptyText: ' - ',
    }),
  ];
  if (resource.value) {
    templates.push(
      ...(resource.value === MorphCost.GearPoints
        ? [
            renderSelectField(complexity, enumValues(Complexity)),
            renderLabeledCheckbox(restricted),
          ]
        : [
            renderNumberField(cost, { min: 0 }),
            renderNumberField(availability, { min: 0, max: 100 }),
          ]),
    );
  }
  return templates;
};

@customElement('sleeve-form-acquisition')
export class SleeveFormAquisition extends LitElement {
  static get is() {
    return 'sleeve-form-acquisition' as const;
  }

  static styles = [styles];

  @property({
    attribute: false,
    hasChanged() {
      return true;
    },
  })
  updateActions!: UpdateActions<AcquisitionData>;

  @property({ type: Boolean, reflect: true }) disabled = false;

  render() {
    return html`
      <sl-header heading=${localize('acquisition')}>
        <div slot="action">
          ${renderMorphAcquisition(this.updateActions.originalValue())}
        </div></sl-header
      >
      ${this.disabled
        ? ''
        : renderUpdaterForm(this.updateActions, {
            classes: 'acquisition-form',
            disabled: this.disabled,
            fields: renderAcquisitionFields,
          })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sleeve-form-acquisition': SleeveFormAquisition;
  }
}
