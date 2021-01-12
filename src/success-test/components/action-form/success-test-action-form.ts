import {
  renderSelectField,
  renderTimeField,
  renderSlider,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { Action, ActionSubtype, ActionType } from '@src/features/actions';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import styles from './success-test-action-form.scss';

@customElement('success-test-action-form')
export class SuccessTestActionForm extends LitElement {
  static get is() {
    return 'success-test-action-form' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) actionState!: {
    action: Action;
    setAction: (change: Partial<Action>) => void;
  };

  render() {
    const { action, setAction } = this.actionState;
    const isTask = action.type === ActionType.Task;

    return html`
      ${renderAutoForm({
        classes: `action-form ${action.type}`,
        props: action,
        noDebounce: true,
        storeOnInput: true,
        update: setAction,
        fields: ({ type, subtype, timeframe, timeMod }) => [
          renderSelectField(type, enumValues(ActionType)),
          renderSelectField(subtype, enumValues(ActionSubtype)),
          html` <div
            class="action-edits ${classMap({
              'show-time': isTask || timeframe.value !== 0,
            })}"
          >
            ${isTask
              ? renderTimeField({
                  ...timeframe,
                  label: `${localize('initial')} ${localize('timeframe')}`,
                })
              : ''}
            ${type.value !== ActionType.Automatic
              ? html`
                  <div class="time-mod ${classMap({ task: isTask })}">
                    <div class="take-time">${localize('takeTime')}</div>
                    ${renderSlider(timeMod, {
                      disabled: isTask && !timeframe.value,
                      max: 6,
                      min: isTask ? -3 : 0,
                      step: 1,
                      markers: true,
                    })}
                    ${isTask
                      ? html` <div class="rush">${localize('rush')}</div> `
                      : ''}
                  </div>
                `
              : ''}
          </div>`,
        ],
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'success-test-action-form': SuccessTestActionForm;
  }
}
