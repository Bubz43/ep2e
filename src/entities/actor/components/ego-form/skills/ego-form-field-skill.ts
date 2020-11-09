import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type {
  AddUpdateRemoveFeature,
  StringID,
} from '@src/features/feature-helpers';
import type { FieldSkillData, FullFieldSkill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { customElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { EgoFormSkillBase, PointsFields } from './ego-form-skill-base';

const renderFields: FieldPropsRenderer<FieldSkillData> = ({
  field,
  specialization,
}) => [
  renderTextInput(field, { placeholder: localize('field') }),
  renderTextInput(specialization, {
    placeholder: localize('specialization'),
  }),
];

@customElement('ego-form-field-skill')
export class EgoFormFieldSkill extends EgoFormSkillBase {
  static get is() {
    return 'ego-form-field-skill' as const;
  }

  @property({ attribute: false }) skill!: FullFieldSkill;

  @property({ type: String }) skillId!: string;

  @property({ attribute: false }) operations!: AddUpdateRemoveFeature<
    StringID<FieldSkillData>
  >;

  private updateSkill = (changed: Partial<FieldSkillData>) =>
    this.operations.update(changed, { id: this.skillId });

  private updatePoints = (points: Partial<PointsFields>) => {
    const newPoints = this.computePoints(points);
    if (newPoints !== undefined) this.updateSkill({ points: newPoints });
  };

  private deleteSelf() {
    this.operations.remove(this.skillId);
  }

  get backLabel() {
    return localize(this.skill.fieldSkill)
  }

  render() {
    return html`
      <div class="main ${classMap({ edit: this.editMain })}">
        <div class="edits">
          <div class="buttons">
            ${this.renderEditCancelButton()}
            <delete-button
              ?disabled=${this.disabled}
              @delete=${this.deleteSelf}
              tabindex=${this.editMain ? 0 : -1}
            ></delete-button>
          </div>
          ${this.editMain ? renderAutoForm({
            classes: 'main-form',
            disabled: this.disabled,
            props: this.skill,
            update: this.updateSkill,
            fields: renderFields,
          }) : ""}
        </div>
        ${this.renderEditToggle()}
      </div>

      ${renderAutoForm({
        classes: 'points-form',
        props: this.skill,
        update: this.updatePoints,
        fields: this.renderPointsFormFields,
      })}
      ${this.renderRipple(this.disabled)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form-field-skill': EgoFormFieldSkill;
  }
}
