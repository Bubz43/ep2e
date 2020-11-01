import { prettyDate } from '@src/features/time';
import { debounce } from '@src/utility/decorators';
import type { DatepickerValueUpdated } from 'app-datepicker/dist/custom_typings';
import {
  customElement,
  LitElement,
  property,
  html,
  PropertyValues,
} from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import mix from 'mix-with/lib';
import { LazyRipple } from '../mixins/lazy-ripple';
import styles from './date-field.scss';

@customElement('sl-date-field')
export class DateField extends mix(LitElement).with(LazyRipple) {
  static get is() {
    return 'sl-date-field' as const;
  }

  static styles = [styles];

  @property({ type: String }) min?: string;

  @property({ type: String }) max?: string;

  @property({ type: String }) value!: string;

  @property({ type: String }) label = '';

  @property({ type: Boolean }) disabled = false;

  @property({ type: Boolean }) required = false;

  @debounce(250, true)
  private updateSlottedInputs() {
    const { value } = this;
    this.querySelectorAll('input').forEach((el) => {
      if (el.value === value) return;
      el.value = value;
      el.dispatchEvent(
        new Event('change', {
          bubbles: true,
          composed: true,
          cancelable: true,
        }),
      );
    });
  }

  get valueAsNumber() {
    return new Date(this.value).getTime();
  }

  updated(changedProps: PropertyValues) {
    if (changedProps.get('value') !== undefined) {
      this.updateSlottedInputs();
    }
  }

  private updateValue(ev: CustomEvent<DatepickerValueUpdated>) {
    this.value = ev.detail.value;
  }

  private renderPicker = () => html`
    <app-datepicker
      min=${ifDefined(this.min)}
      max=${ifDefined(this.max)}
      value=${this.value}
      @datepicker-value-updated=${this.updateValue}
      inline
    ></app-datepicker>
  `;

  render() {
    return html`
      <sl-popover unpadded .renderOnDemand=${this.renderPicker} center>
        <button
          slot="base"
          ?disabled=${this.disabled}
          @focus="${this.handleRippleFocus}"
          @blur="${this.handleRippleBlur}"
          @mousedown="${this.handleRippleMouseDown}"
          @mouseenter="${this.handleRippleMouseEnter}"
          @mouseleave="${this.handleRippleMouseLeave}"
        >
          ${this.renderRipple(this.disabled)}
          <wl-label nowrap ?required=${this.required}>${this.label}</wl-label>
          <time datetime=${this.value}>${prettyDate(this.value)}</time>
        </button>
      </sl-popover>
      <slot hidden></slot>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-date-field': DateField;
  }
}
