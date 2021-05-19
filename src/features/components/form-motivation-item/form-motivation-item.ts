import { renderCheckbox, renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import {
  addUpdateRemoveFeature,
  idProp,
  StringID,
} from '@src/features/feature-helpers';
import {
  createMotivationalGoal,
  Motivation,
  MotivationStance,
} from '@src/features/motivations';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { debounce } from '@src/utility/decorators';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property, state } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import styles from './form-motivation-item.scss';
import { UpdatedMotivationEvent } from './updated-motivation-event';

/**
 * @fires updated-motivation
 */
@customElement('form-motivation-item')
export class FormMotivationItem extends LitElement {
  static get is() {
    return 'form-motivation-item' as const;
  }

  static styles = [styles];

  @property({ type: Object }) motivation!: Motivation | StringID<Motivation>;

  @property({ type: Boolean }) disabled = false;

  @state() expandGoals = false;

  private readonly goalOps = addUpdateRemoveFeature<
    Motivation['goals'][number]
  >(() => async (newValue) => {
    const newGoals =
      typeof newValue === 'function'
        ? newValue(this.motivation.goals)
        : newValue;
    this.emitUpdate({ goals: newGoals });
  });

  private toggleStance() {
    const newStance =
      this.motivation.stance === MotivationStance.Support
        ? MotivationStance.Oppose
        : MotivationStance.Support;
    this.emitUpdate({ stance: newStance });
    tooltip.updateContent(localize(newStance));
  }

  private toggleExpandedGoals() {
    this.expandGoals = !this.expandGoals;
  }

  private emitUpdate = (changed: Partial<Motivation>) => {
    this.dispatchEvent(
      new UpdatedMotivationEvent(
        changed,
        'id' in this.motivation ? this.motivation.id : undefined,
      ),
    );
  };

  @debounce(150)
  private addGoal() {
    this.goalOps.add({}, createMotivationalGoal({}));
  }

  render() {
    const { motivation, disabled } = this;
    return html`
      <mwc-icon-button-toggle
        @click=${this.toggleStance}
        ?on=${motivation.stance === MotivationStance.Support}
        onIcon="add"
        offIcon="remove"
        data-tooltip=${localize(motivation.stance)}
        @mouseenter=${tooltip.fromData}
        ?disabled=${disabled}
      ></mwc-icon-button-toggle>
      ${renderAutoForm({
        props: motivation,
        update: this.emitUpdate,
        noDebounce: true,
        classes: 'cause-form',
        disabled,
        fields: ({ cause }) =>
          renderTextInput(cause, { placeholder: cause.label }),
      })}

      <mwc-button
        @click=${this.toggleExpandedGoals}
        dense
        class="goals-toggle"
        label="${localize('goals')}: ${motivation.goals.length}"
        ?disabled=${motivation.goals.length === 0}
        icon=${ifDefined(
          notEmpty(motivation.goals)
            ? this.expandGoals
              ? 'keyboard_arrow_down'
              : 'keyboard_arrow_left'
            : undefined,
        )}
        trailingIcon
      ></mwc-button>

      <mwc-icon-button
        icon="add"
        class="new-goal-button"
        data-tooltip="${localize('add')} ${localize('goal')}"
        @mouseenter=${tooltip.fromData}
        @focus=${tooltip.fromData}
        ?disabled=${disabled}
        @click=${this.addGoal}
      ></mwc-icon-button>
      <delete-button
        class="delete-self-button"
        ?disabled=${disabled}
      ></delete-button>

      ${this.expandGoals && notEmpty(motivation.goals)
        ? html`
            <sl-animated-list class="goals-list" transformOrigin="top">
              ${repeat(
                motivation.goals,
                idProp,
                (goalInfo) => html`
                  <li>
                    ${renderAutoForm({
                      props: goalInfo,
                      classes: 'goal-form',
                      disabled,
                      update: this.goalOps.update,
                      fields: ({ completed, goal }) => [
                        renderCheckbox(completed),
                        renderTextInput(goal, { placeholder: goal.label }),
                      ],
                    })}
                    <delete-button
                      icon="close"
                      ?disabled=${disabled}
                      @delete=${(ev: Event) => {
                        ev.stopPropagation();
                        this.goalOps.remove(goalInfo.id);
                      }}
                    ></delete-button>
                  </li>
                `,
              )}
            </sl-animated-list>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'form-motivation-item': FormMotivationItem;
  }
}
