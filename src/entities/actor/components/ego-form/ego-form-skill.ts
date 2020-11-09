import {
  renderNumberField,
  renderNumberInput,
  renderTextField,
  renderTextInput,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import type { FullSkill } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { clickIfEnter } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  PropertyValues,
  internalProperty,
} from 'lit-element';
import mix from 'mix-with/lib';
import styles from './ego-form-skill.scss';

@customElement('ego-form-skill')
export class EgoFormSkill extends mix(LitElement).with(LazyRipple) {
  static get is() {
    return 'ego-form-skill' as const;
  }

  static styles = [styles];

  @property({ type: Object }) skill!: FullSkill;

  @property({ type: Boolean, reflect: true }) disabled = false;

  @property({ type: Boolean, reflect: true }) filtered = false;

  @property({ type: Boolean }) editTotal = false;

  @internalProperty() editMain = false;

  // @property({ attribute: false }) updateValues!: ()

  // updated(changedProps: PropertyValues) {
  //   if (changedProps.has('disabled')) {
  //     this.tabIndex = this.disabled ? -1 : 0;
  //   }
  //   super.updated(changedProps);
  // }

  firstUpdated() {
    this.setAttribute('role', 'listitem');
    this.addEventListener('focusin', this.handleRippleFocus.bind(this));
    this.addEventListener('focusout', this.handleRippleBlur.bind(this));
    // this.addEventListener('mousedown', this.handleRippleMouseDown.bind(this));
    this.addEventListener('mouseenter', this.handleRippleMouseEnter.bind(this));
    this.addEventListener('mouseleave', this.handleRippleMouseLeave.bind(this));
    // this.addEventListener('keydown', clickIfEnter);
  }

  handleRippleMouseDown(ev?: Event) {
    if (!(ev?.composedPath()[0] instanceof HTMLInputElement)) {
      super.handleRippleMouseDown(ev);
    }
  }

  private toggleEditMain() {
    this.editMain = !this.editMain;
  }

  render() {
    const { skill } = this;
    const { aptBonus } = skill;
    return html`
      ${this.editMain
        ? html`
            <div class="main">
              <div class="buttons">
                <mwc-button
                  dense
                  icon="arrow_back"
                  label=${skill.name}
                  @click=${this.toggleEditMain}
                ></mwc-button>
                <delete-button></delete-button>
              </div>
              ${renderAutoForm({
                classes: 'main-form',
                disabled: this.disabled,
                props: { field: '', specialization: '' },
                update: () => {},
                fields: ({ field, specialization }) => html`
                  ${[
                    renderTextInput(field, { placeholder: localize('field') }),
                    renderTextInput(specialization, {
                      placeholder: localize('specialization'),
                    }),
                  ]}
                `,
              })}
            </div>
          `
        : html`
            <button
              tabindex="-1"
              @mousedown="${this.handleRippleMouseDown}"
              @click=${this.toggleEditMain}
              ?disabled=${this.disabled}
            >
              <span class="name">${skill.fullName}</span>
              <span class="info">
                ${[
                  `${localize('FULL', skill.linkedAptitude)}
                ${skill.aptMultiplier !== 1 ? `x${skill.aptMultiplier}` : ''}`,
                  localize(skill.category),
                ].join(' | ')}
              </span>
            </button>
          `}
      ${renderAutoForm({
        classes: 'points-form',
        props: skill,
        update: ({ points, total }) => {
          const newPoints = points ?? (total && total - aptBonus);
          if (newPoints !== undefined) {
            // update({ points: newPoints });
          }
        },
        fields: ({ points, total }) => [
          renderNumberInput(points, {
            min: 0,
            max: 98,
            disabled: this.disabled || this.editTotal,
          }),
          renderNumberInput(total, {
            min: aptBonus,
            max: 98 + aptBonus,
            disabled: this.disabled || !this.editTotal,
          }),
        ],
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
