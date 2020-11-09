import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { FullSkill, SkillData } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { customElement, html, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { EgoFormSkillBase, PointsFields } from './ego-form-skill-base';
import styles from './ego-form-skill.scss';

const renderFields: FieldPropsRenderer<SkillData> = ({ specialization }) =>
renderTextInput(specialization, {
  placeholder: localize('specialization'),
})

@customElement('ego-form-skill')
export class EgoFormSkill extends EgoFormSkillBase {
  static get is() {
    return 'ego-form-skill' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) skill!: FullSkill;

  @property({ attribute: false }) skillUpdate!: (changed: Partial<SkillData>) => void

  private updatePoints = (changed: Partial<PointsFields>) => {
    const newPoints = this.computePoints(changed);
    if (newPoints !== undefined) this.skillUpdate({ points: newPoints })
  }

  render() {
    return html`
      <div class="main ${classMap({ edit: this.editMain })}">
        <div class="edits">
          <div class="buttons">${this.renderEditCancelButton()}</div>
          ${renderAutoForm({
            classes: 'main-form',
            disabled: this.disabled,
            props: this.skill,
            update: this.skillUpdate,
            fields: renderFields,
          })}
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
    'ego-form-skill': EgoFormSkill;
  }
}
