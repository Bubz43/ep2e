import {
  renderSelectField,
  renderTimeField,
  renderSlider,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { Action, ActionSubtype, ActionType } from '@src/features/actions';
import { localize } from '@src/foundry/localization';
import type { CoolStore } from 'cool-store';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import styles from './action-form.scss';

@customElement('st-action-form')
export class STActionForm extends LitElement {
  static get is() {
    return 'st-action-form' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false })
  actionStore!: CoolStore<Action>;

  @internalProperty() private action!: Action;

  private unsub?: { unsubscribe: () => void };

  update(changedProps: PropertyValues) {
    if (changedProps.has('actionStore')) {
      this.unsub?.unsubscribe();
      this.unsub = this.actionStore
        .getChanges()
        .subscribe((state) => (this.action = state));
    }
    super.update(changedProps);
  }

  disconnectedCallback() {
    this.unsub?.unsubscribe();
    super.disconnectedCallback();
  }

  render() {
    const { action } = this;
    const isTask = action.type === ActionType.Task;
    console.log('render');
    return html`
      ${renderAutoForm({
        classes: `action-form ${action.type}`,
        props: action,
        noDebounce: true,
        storeOnInput: true,
        update: (changed) =>
          this.actionStore.set((state) => void Object.assign(state, changed)),
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
    'st-action-form': STActionForm;
  }
}
