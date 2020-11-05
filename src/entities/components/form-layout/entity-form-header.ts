import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { UpdateStore } from '@src/entities/update-store';
import { closeImagePicker, openImagePicker } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './entity-form-header.scss';

@customElement('entity-form-header')
export class EntityFormHeader extends LitElement {
  static get is() {
    return 'entity-form-header' as const;
  }

  static styles = [styles];

  @property({
    attribute: false,
    type: Object,
    hasChanged() {
      return true;
    },
  })
  updater!: UpdateStore<{
    name: string;
    img: string;
  }>;

  @property({ type: String }) type!: string;

  @property({ type: Boolean }) noDefaultImg = false;

  @property({ type: String }) altName?: string;

  async connectedCallback() {
    super.connectedCallback();
    if (!this.disabled) {
      await this.updateComplete;
      setTimeout(() => {
        this.renderRoot.querySelector('input')?.focus();
      }, 100);
    }
  }

  disconnectedCallback() {
    closeImagePicker(this);
    super.disconnectedCallback();
  }

  firstUpdated() {
    // Fix for firefox not properly applying column gap
    requestAnimationFrame(() => (this.style.columnGap = '1rem'));
  }

  private editImg() {
    const { originalValue, commit } = this.updater.prop('img');
    openImagePicker(this, originalValue(), commit);
  }

  private updateEgoName = ({ name }: { name?: string }) => {
    if (name) this.updater.prop('name').commit(name);
    else this.requestUpdate();
  };

  private get disabled() {
    return !this.updater.editable;
  }

  private nameInput: FieldPropsRenderer<{ name: string }> = ({ name }) => {
    return renderTextInput(name);
  };

  private nameParts(name: string) {
    if (this.altName) {
      const initial = this.altName.indexOf(name);
      const last = this.altName.lastIndexOf(name);
      if (initial === last) {
        const [before, after] = this.altName
          .replace(name, '__**__')
          .split('__**__');
        return {
          before,
          middle: name,
          after,
        };
      }
      return { middle: this.altName };
    }
    return { middle: name };
  }

  render() {
    const { name, img } = this.updater.prop('').originalValue();
    // TODO Reset img on right click options
    const hideImg = this.noDefaultImg && img === CONST.DEFAULT_TOKEN;
    const { before, middle, after } = this.nameParts(name);
    return html`
      ${hideImg && this.disabled
        ? ''
        : html`
            <button
              class="avatar-button"
              @click=${this.editImg}
              ?disabled=${this.disabled}
            >
              ${hideImg
                ? html` <span class="image-select">${localize('icon')}</span> `
                : html`
                    <img src=${img} class="avatar" alt="Avatar of ${name}" />
                  `}
            </button>
          `}
      ${renderAutoForm({
        disabled: this.disabled,
        props: { name },
        update: this.updateEgoName,
        fields: this.nameInput,
      })}

      <!-- <h1 class=${this.disabled ? '' : 'editable-sheet'}>
        ${before ? html`<span class="name-part">${before}</span>` : ''}
        ${middle} ${after ? html`<span class="name-part">${after}</span>` : ''}
      </h1> -->

      <ul class="tags">
        <slot name="tag"></slot>
      </ul>

      <div class="type">
        ${this.type} ${this.disabled ? html`<mwc-icon>lock</mwc-icon>` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'entity-form-header': EntityFormHeader;
  }
}
