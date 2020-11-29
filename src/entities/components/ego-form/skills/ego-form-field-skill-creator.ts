import {
  renderTextField,
  renderNumberField,
  renderSelectField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { SubmitButton } from '@src/components/submit-button/submit-button';
import { enumValues } from '@src/data-enums';
import type { Ego } from '@src/entities/actor/ego';
import { addFeature } from '@src/features/feature-helpers';
import {
  FieldSkillType,
  FieldSkillData,
  createFieldSkillData,
  fieldSkillInfo,
  fieldSkillName,
} from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { safeMerge } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  css,
  query,
} from 'lit-element';
import { reject } from 'remeda';

@customElement('ego-form-field-skill-creator')
export class EgoFormFieldSkillCreator extends LitElement {
  static get is() {
    return 'ego-form-field-skill-creator' as const;
  }

  static styles = [
    css`
      :host {
        display: block;
        width: 250px;
      }
      submit-button {
        width: 100%;
      }
    `,
  ];

  @property({ attribute: false }) ego!: Ego;

  @query('submit-button')
  submitButton!: SubmitButton;

  @query('input')
  input?: HTMLInputElement;

  private fieldSkill: FieldSkillType = FieldSkillType.Know;

  private fieldSkillData: FieldSkillData = this.newFieldSkillData();

  firstUpdated() {
    this.addEventListener(
      'keypress',
      (ev) => {
        if (
          ev.key === 'Enter' &&
          ev.composedPath().some((el) => el instanceof HTMLInputElement)
        ) {
          this.submitButton.click();
        }
      },
      { capture: true },
    );
  }

  get fieldSkills() {
    return this.ego.epData.fieldSkills[this.fieldSkill];
  }

  get fieldSkillInfo() {
    return fieldSkillInfo[this.fieldSkill];
  }

  private newFieldSkillData() {
    this.fieldSkillData = createFieldSkillData({});
    return this.fieldSkillData;
  }

  private get invalidFieldMessage() {
    const { field } = this.fieldSkillData;
    if (!field) return `${localize('field')} ${localize('required')}`;

    const fieldIds = { field, fieldSkill: this.fieldSkill };
    if (this.ego.findFieldSkill(fieldIds)) {
      return `${fieldSkillName(fieldIds)} ${localize(
        'exists',
      ).toLocaleLowerCase()}.`;
    }

    return undefined;
  }

  private updateFieldSkill = (props: Partial<FieldSkillData>) => {
    const { aptitudes, categories } = this.fieldSkillInfo;
    this.fieldSkillData = safeMerge(this.fieldSkillData, props);

    if (
      !aptitudes.includes(this.fieldSkillData.linkedAptitude) &&
      aptitudes[0]
    ) {
      this.fieldSkillData.linkedAptitude = aptitudes[0];
    }
    if (!categories.includes(this.fieldSkillData.category) && categories[0]) {
      this.fieldSkillData.category = categories[0];
    }
    return this.requestUpdate();
  };

  private async addField() {
    const { fieldSkill, ego, invalidFieldMessage } = this;

    if (invalidFieldMessage) return;

    await ego.updater
      .prop('data', 'fieldSkills', fieldSkill)
      .commit(addFeature(this.fieldSkillData));

    this.newFieldSkillData();

    requestAnimationFrame(() => this.input?.focus());
    this.requestUpdate();
  }

  private fieldSkillFields: FieldPropsRenderer<FieldSkillData> = ({
    field,
    points,
    linkedAptitude,
    category,
    specialization,
  }) => {
    const { aptitudes, categories, sampleFields } = this.fieldSkillInfo;
    const { invalidFieldMessage } = this;
    const { aptitudes: aptPoints } = this.ego;
    return [
      renderTextField(field, {
        listId: 'sample-fields',
        required: true,
        helpText: invalidFieldMessage,
        helpPersistent: true,
      }),
      renderSelectField(linkedAptitude, aptitudes, {
        altLabel: (apt) => `${localize('FULL', apt)} (${aptPoints[apt]})`,
      }),
      renderNumberField(points, {
        min: 0,
        max: 98,
        helpText: `${localize('total')} ${
          points.value + aptPoints[linkedAptitude.value]
        }`,
        helpPersistent: true,
      }),
      renderTextField(specialization),
      renderSelectField(category, categories),
      html`
        <datalist id="sample-fields">
          ${reject(sampleFields, (sample) =>
            this.fieldSkills.some(
              (fs) =>
                fs.field.toLocaleLowerCase() ===
                localize(sample).toLocaleLowerCase(),
            ),
          ).map((f) => html` <option value="${localize(f)}"></option> `)}
        </datalist>
      `,
    ];
  };

  private updateFieldSkillType = async ({
    fieldSkill,
  }: {
    fieldSkill?: FieldSkillType;
  }) => {
    if (fieldSkill) {
      this.fieldSkill = fieldSkill;
      await this.updateFieldSkill({ field: '' });
      requestAnimationFrame(() => this.requestUpdate());
    }
  };

  render() {
    const { invalidFieldMessage, fieldSkill } = this;
    return html`
      ${renderAutoForm({
        noDebounce: true,
        props: { fieldSkill },
        update: this.updateFieldSkillType,
        fields: ({ fieldSkill }) =>
          renderSelectField(fieldSkill, enumValues(FieldSkillType)),
      })}
      ${renderAutoForm({
        noDebounce: true,
        props: this.fieldSkillData,
        update: this.updateFieldSkill,
        fields: this.fieldSkillFields,
        storeOnInput: true,
      })}

      <submit-button
        slot="submit"
        @submit-attempt=${this.addField}
        ?complete=${!invalidFieldMessage}
        label="${localize('create')} ${localize('skill')}"
      ></submit-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form-field-skill-creator': EgoFormFieldSkillCreator;
  }
}
