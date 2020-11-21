import { renderNumberInput } from '@src/components/field/fields';
import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import type { Skill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { LitElement, property, html, internalProperty } from 'lit-element';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import styles from './ego-form-skill.scss';

export type PointsFields = Record<'points' | 'total', number>;

export abstract class EgoFormSkillBase extends mix(LitElement).with(
  LazyRipple,
) {
  static styles = [styles];

  declare abstract skill: Skill;

  declare abstract readonly backLabel: string;

  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ type: Boolean, reflect: true }) filtered = false;

  @property({ type: Boolean }) editTotal = false;

  @internalProperty() editMain = false;

  firstUpdated() {
    this.setAttribute('role', 'listitem');
    this.addEventListener('focusin', this.handleRippleFocus.bind(this));
    this.addEventListener('focusout', this.handleRippleBlur.bind(this));
    this.addEventListener('mouseenter', this.handleRippleMouseEnter.bind(this));
    this.addEventListener('mouseleave', this.handleRippleMouseLeave.bind(this));
  }

  handleRippleMouseDown(ev?: Event) {
    if (!(ev?.composedPath()[0] instanceof HTMLInputElement)) {
      super.handleRippleMouseDown(ev);
    }
  }

  protected toggleEditMain() {
    this.editMain = !this.editMain;
  }

  protected computePoints({ points, total }: Partial<PointsFields>) {
    return points ?? (total && total - this.skill.aptBonus);
  }

  protected renderEditCancelButton() {
    return html`
      <mwc-button
        dense
        tabindex=${this.editMain ? 0 : -1}
        icon="arrow_back"
        label=${this.backLabel}
        @click=${this.toggleEditMain}
      ></mwc-button>
    `;
  }

  protected renderEditToggle() {
    const { skill } = this;
    return html` <button
      class="edit-toggle"
      tabindex="-1"
      @mousedown="${this.handleRippleMouseDown}"
      @click=${this.toggleEditMain}
      ?disabled=${this.disabled}
    >
      <span class="name">${skill.fullName}</span>
      <span class="info">
        ${compact([
          `${localize('FULL', skill.linkedAptitude)}
          ${skill.aptMultiplier !== 1 ? `x${skill.aptMultiplier}` : ''}`,
          localize(skill.category),
          skill.points === 0 ? localize('defaulting') : '',
        ]).join(' | ')}
      </span>
    </button>`;
  }

  protected renderPointsFormFields: FieldPropsRenderer<PointsFields> = ({
    points,
    total,
  }) => [
    renderNumberInput(points, {
      min: 0,
      max: 98,
      disabled: this.disabled || this.editTotal,
    }),
    renderNumberInput(total, {
      min: this.skill.aptBonus,
      max: 98 + this.skill.aptBonus,
      disabled: this.disabled || !this.editTotal,
    }),
  ];
}
