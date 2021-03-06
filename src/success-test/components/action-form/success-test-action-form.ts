import {
  renderLabeledCheckbox,
  renderSelectField,
  renderSlider,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import {
  ActionSubtype,
  actionTimeframeModifier,
  ActionType,
} from '@src/features/actions';
import { localize } from '@src/foundry/localization';
import type { SuccessTestBase } from '@src/success-test/success-test-base';
import { customElement, html, LitElement, property } from 'lit-element';
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

  @property({ attribute: false })
  action!: SuccessTestBase['action'];

  @property({ type: String }) fullMoveLabel = localize('fullMove');

  render() {
    const { action } = this;
    const isTask = action.type === ActionType.Task;
    return html`
      ${renderAutoForm({
        classes: `action-form ${action.type}`,
        props: action,
        noDebounce: true,
        storeOnInput: true,
        update: action.update,
        fields: ({ type, subtype, timeframe, timeMod, fullMove }) => [
          renderSelectField(type, enumValues(ActionType)),
          renderSelectField(subtype, enumValues(ActionSubtype)),
          subtype.value === ActionSubtype.Physical
            ? renderLabeledCheckbox({ ...fullMove, label: this.fullMoveLabel })
            : '',
          html` <div
            class="action-edits ${classMap({
              'show-time': isTask || timeframe.value !== 0,
            })}"
          >
            ${isTask
              ? html`<div class="timeframe-info">
                  ${renderTimeField(timeframe)}
                  <div class="multiplier">
                    x${actionTimeframeModifier(action).modifier + 1}
                  </div>
                </div>`
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
