import { debounce } from '@src/utility/decorators';
import { FieldValue, isFieldValue } from '@src/utility/field-values';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
  query,
} from 'lit-element';
import { stopEvent } from 'weightless/util/event';
import type { FieldElement } from '../field/fields';
import styles from './form.scss';
import { FormValueStoredEvent, SlCustomStoreEvent } from './forms';
import { validateFormField } from './validations';
import { observer } from '@material/mwc-base/observer.js';

export type SlFormData = {
  key: string;
  value: FieldValue;
};

const stopProp = (ev: Event) => ev.stopPropagation();

@customElement('sl-form')
export class Form extends LitElement {
  static get is() {
    return 'sl-form' as const;
  }

  static styles = [styles];

  @property({ type: Object })
  @observer(function (this: Form, val: FieldValue) {
    this.store = {};
    this.toggleCompleteOnSubmits();
  })
  validProperties!: Record<string, FieldValue>;

  @property({ type: Boolean }) storeOnInput = false;

  @property({ type: Boolean }) submitEmpty = false;

  @property({ type: Boolean }) disabled = false;

  @property({ type: Boolean }) noDebounce = false;

  @query('slot[name="submit"') submitSlot!: HTMLSlotElement;

  private store: Record<string, FieldValue> = {};

  updated(changedProps: PropertyValues) {
    changedProps.get('disabled') !== undefined &&
      requestAnimationFrame(() => this.toggleElementDisabled());
  }

  firstUpdated() {
    if (this.disabled) {
      requestAnimationFrame(() => this.toggleElementDisabled());
    }
  }
  

  get elements(): FieldElement[] {
    return Array.from(
      this.querySelectorAll<FieldElement>(
        'input, select, textarea, mwc-checkbox, mwc-switch, mwc-radio, mwc-slider, time-field, mwc-textfield, mwc-textarea, mwc-select',
      ),
    );
  }

  toggleElementDisabled() {
    const disable = this.disabled;
    const attrName = 'data-_disabled';
    this.elements.forEach((el) => {
      if (!disable) {
        if (!el.hasAttribute(attrName)) el.disabled = false;
        el.removeAttribute(attrName);
      } else {
        el.toggleAttribute(attrName, el.disabled);
        el.disabled = true;
      }
    });
    this.submitButtons.forEach((el) => el.toggleAttribute('disabled', disable));
  }

  get hasStoredValues() {
    return notEmpty(this.store);
  }

  isComplete({ report = false }) {
    return (
      this.IsValid({ report }) && (this.submitEmpty || this.hasStoredValues)
    );
  }

  IsValid({ report = true }) {
    return this.elements.every((input) => {
      if ('reportValidity' in input) {
        return report ? input.reportValidity() : input.checkValidity();
      }
      return true;
    });
  }

  addToStore({ key, value, trim }: SlFormData & { trim?: boolean }) {
    if (this.disabled) return;
    const trimmed = typeof value === 'string' && trim ? value.trim() : value;
    const validValue = this.validProperties[key];
    if (typeof validValue !== typeof trimmed) {
      return;
    } else if (validValue === trimmed) {
      delete this.store[key];
      this.toggleCompleteOnSubmits();
      return;
    }
    if (isFieldValue(trimmed)) {
      this.store[key] = trimmed;
      this.toggleCompleteOnSubmits();
      this.emitStoreEvent();
    }
  }

  private get submitButtons() {
    return this.submitSlot.assignedElements({ flatten: true });
  }

  private toggleCompleteOnSubmits() {
    const { submitButtons } = this;
    if (notEmpty(submitButtons)) {
      const complete = this.isComplete({ report: false });
      for (const el of submitButtons) {
        el.toggleAttribute('complete', complete);
      }
    }
  }

  emitStoreEvent() {
    if (this.noDebounce) this.emitStore();
    else this.debouncedEmit();
  }

  @debounce(250)
  private debouncedEmit() {
    this.emitStore();
  }

  private emitStore() {
    this.dispatchEvent(new FormValueStoredEvent(this));
  }

  submit(ev?: Event) {
    ev?.stopPropagation();

    if (this.isComplete({ report: true })) {
      const { store } = this;
      this.dispatchEvent(new CustomEvent('form-data', { detail: store }));
      this.store = {};
    }
  }

  getAndClearFormData() {
    const { store } = this;
    this.store = {};
    return store;
  }

  private validate(ev: Event) {
    ev.stopPropagation();
    const inputEvent = ev.type === 'input';
    if (inputEvent && !this.storeOnInput) return;
    const { key, value, required } = validateFormField(
      ev.target as FieldElement,
    );
    if (key)
      this.addToStore({
        key,
        value,
        trim: notEmpty(this.submitButtons) || !this.storeOnInput || !inputEvent,
      });
  }

  private handleKeyDown(ev: KeyboardEvent) {
    ev.stopPropagation();
    if (ev.key === 'Enter' && !ev.shiftKey) {
      this.validate(ev);
      for (const button of this.submitButtons) {
        (button as HTMLElement).click();
      }
    }
  }

  private storeCustomData(ev: Event) {
    ev.stopPropagation();
    if (ev instanceof SlCustomStoreEvent) {
      this.addToStore(ev.formData);
    }
  }

  render() {
    // TODO: stopEvent on keypress and keyup if needed
    return html`
      <slot
        @keydown=${this.handleKeyDown}
        @keyup=${stopEvent}
        @input=${this.validate}
        @change=${this.validate}
        @form-custom-store=${this.storeCustomData}
      >
      </slot>
      <slot
        name="submit"
        @keydown=${stopProp}
        @keyup=${stopEvent}
        @submit-attempt=${this.submit}
      >
      </slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-form': Form;
  }
}
