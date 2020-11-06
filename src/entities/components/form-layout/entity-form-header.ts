import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { UpdateActions, UpdateStore } from '@src/entities/update-store';
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
    hasChanged() {
      return true
    }
  })
    updateActions!: UpdateActions<{name: string, img: string}>

  @property({ type: String }) type!: string;

  @property({ type: Boolean }) noDefaultImg = false;

  @property({ type: Boolean }) disabled = false;

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
    const { originalValue, commit } = this.updateActions;
    openImagePicker(this, originalValue().img, newImg => commit({ img: newImg }));
  }

  private updateEgoName = ({ name }: { name?: string }) => {
    if (name) this.updateActions.commit({name});
    else this.requestUpdate();
  };

  private nameInput: FieldPropsRenderer<{ name: string }> = ({ name }) => {
    return renderTextInput(name);
  };


  render() {
    const { name, img } = this.updateActions.originalValue();
    // TODO Reset img on right click options
    const hideImg = this.noDefaultImg && img === CONST.DEFAULT_TOKEN;
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
