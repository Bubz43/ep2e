import { customElement, LitElement, property, html, query } from 'lit-element';
import styles from './field.scss';
import { classMap } from 'lit-html/directives/class-map';
import { nothing } from 'lit-html';
import { debounce } from '@src/utility/decorators';

type FieldInput = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const showSelectIcon = CSS.supports('-moz-appearance', 'none');

const isFieldInput = (el: Node | null | undefined): el is FieldInput =>
  el instanceof HTMLInputElement ||
  el instanceof HTMLSelectElement ||
  el instanceof HTMLTextAreaElement;

@customElement('sl-field')
export class Field extends LitElement {
  static get is() {
    return 'sl-field' as const;
  }

  static styles = [styles];

  static additionalStyles?: HTMLTemplateElement;

  @property({ type: String }) label = '';

  @property({ type: String }) helpText = '';

  @property({ type: Boolean }) helpPersistent = false;

  @property({ type: String }) validationMessage = '';

  @property({ type: Boolean, reflect: true }) dirty = false;

  @property({ type: Boolean, reflect: true }) private disabled = false;

  @query('.input-slot') inputSlot!: HTMLSlotElement;

  private mutationObs?: MutationObserver | null;

  async connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', () => this.focusInput());
    if (this.hasUpdated) {
      await this.updateComplete;
      this.onInputChanged();
    }
  }

  disconnectedCallback() {
    this.mutationObs?.disconnect();
    super.disconnectedCallback();
  }

  get input() {
    if (this.hasUpdated) {
      for (const el of this.inputSlot.assignedElements()) {
        if (isFieldInput(el)) return el;
      }
    }
    return null;
  }

  private setupMutationObs() {
    const { input } = this;
    if (!input) return;
    if (this.mutationObs) this.mutationObs.disconnect();
    this.mutationObs = new MutationObserver((entries: MutationRecord[]) => {
      let changed = false;
      for (const { attributeName, oldValue, target } of entries) {
        if (!attributeName || !isFieldInput(target)) continue;
        const newVal = target.getAttribute(attributeName);
        if (attributeName === 'disabled') this.disabled = !!target.disabled;
        changed = changed || newVal !== oldValue;
      }

      if (changed) setTimeout(() => this.requestUpdate(), 10);
    });
    this.mutationObs.observe(input, {
      attributeFilter: ['min', 'max', 'value', 'disabled', 'maxlength'],
      attributeOldValue: true,
      attributes: true,
    });
  }

  private onInputChanged() {
    this.setupMutationObs();
    this.dirty = false;
    this.requestUpdate();
  }

  @debounce(50)
  private updateFromInput() {
    this.dirty = true;
    this.requestUpdate();
  }

  private focusInput() {
    const { input, disabled } = this;
    this.requestUpdate();
    if (disabled) return;
    if (input) {
      input.click();
      input.focus();
    }
  }

  private getInputState() {
    const { input, dirty } = this;
    if (!input) return {};
    this.disabled = !!input.disabled;
    const invalid = dirty && input.matches(':invalid');
    const characterCounter =
      input instanceof HTMLInputElement &&
      input.maxLength !== -1 &&
      ([input.value.length, input.maxLength] as const);
    let above = !!input.value;
    if (!above) {
      if (input instanceof HTMLSelectElement) {
        const selectedText = input.selectedOptions[0]?.textContent;
        if (!selectedText) above = false;
        else if (selectedText.length > 1) above = true;
      } else above = !!input.placeholder;
    }
    return {
      invalid,
      above,
      required: input.required,
      textarea: input.localName === 'textarea',
      characterCounter,
    };
  }

  private renderNumberButtons() {
    const { input, disabled } = this;
    if (input instanceof HTMLInputElement && input.type === 'number') {
      const value = input.valueAsNumber;
      const maxEnabled = !disabled && (!input.max || value < Number(input.max));
      const minEnabled = !disabled && (!input.min || value > Number(input.min));

      return html`
        <div class="number-buttons">
          ${([
            ['remove', !minEnabled],
            ['add', !maxEnabled],
          ] as [string, boolean][]).map(
            ([action, disable]) => html`
              <button
                tabindex="-1"
                @click=${this.stepInput}
                data-action=${action}
                ?disabled=${disable}
              >
                <mwc-icon>${action}</mwc-icon>
              </button>
            `,
          )}
        </div>
      `;
    }
    return nothing;
  }

  private renderSelectIcon() {
    return this.input?.localName === 'select' && showSelectIcon
      ? html`
          <mwc-icon @click=${this.focusInput} class="select-icon"
            >expand_more</mwc-icon
          >
        `
      : nothing;
  }

  private stepInput(ev: Event) {
    ev.preventDefault();
    const { input } = this;
    if (
      input instanceof HTMLInputElement &&
      !input.disabled &&
      input.type === 'number'
    ) {
      const button = ev.currentTarget as HTMLElement;
      const { action } = button.dataset;

      if (action === 'remove') input.stepDown();
      else input.stepUp();

      input.dispatchEvent(
        new Event('change', { bubbles: true, composed: true }),
      );
    }
  }

  render() {
    const {
      invalid = false,
      above = false,
      required = false,
      textarea = false,
      characterCounter,
    } = this.getInputState();
    const labelClasses = {
      above,
      label: true,
      invalid,
    };
    const wrapper = {
      'input-wrapper': true,
      textarea,
    };
    const footerClasses = {
      invalid,
    };
    return html`
      <wl-label class=${classMap(labelClasses)} ?required=${required} nowrap>
        ${this.label}
      </wl-label>
      <slot name="before"></slot>
      <div
        class=${classMap(wrapper)}
        @change=${this.updateFromInput}
        @wheel=${this.updateFromInput}
        @input=${this.updateFromInput}
      >
        <slot @slotchange=${this.onInputChanged} class="input-slot"></slot>
        ${this.renderSelectIcon()}
      </div>
      <slot name="after"> ${this.renderNumberButtons()} </slot>

      <footer class=${classMap(footerClasses)}>
        <span class="help-text"
          >${invalid ? this.validationMessage : this.helpText}</span
        >
        ${characterCounter
          ? html`
              <span class="character-counter"
                >${characterCounter.join(' / ')}</span
              >
            `
          : ''}
      </footer>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sl-field': Field;
  }
}
