import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { UpdateActions, UpdateStore } from '@src/entities/update-store';
import { closeImagePicker, openImagePicker } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './entity-form-header.scss';

type CommonInfo = { name: string; img: string };

/**
 * @slot tag
 */
@customElement('entity-form-header')
export class EntityFormHeader extends LitElement {
  static get is() {
    return 'entity-form-header' as const;
  }

  static styles = [styles];

  @property({
    attribute: false,
    hasChanged() {
      return true;
    },
  })
  updateActions!: UpdateActions<CommonInfo>;

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

  private updateImage = (img: string) => this.updateActions.commit({ img });

  private editImg() {
    const { originalValue, commit } = this.updateActions;
    openImagePicker(this, originalValue().img, this.updateImage);
  }

  private updateEgoName = ({ name }: { name?: string }) => {
    if (name) this.updateActions.commit({ name });
    else this.requestUpdate();
  };

  private nameInput: FieldPropsRenderer<{ name: string }> = ({ name }) => {
    return renderTextInput(name);
  };

  render() {
    const { name, img } = this.updateActions.originalValue();

    return html`
      ${this.renderIcon({ name, img })}
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

  private openResetMenu(ev: MouseEvent) {
    openMenu({
      content: [
        {
          label: `${localize(this.noDefaultImg ? 'clear' : 'reset')} ${localize(
            'image',
          )}`,
          icon: html`<mwc-icon>clear</mwc-icon>`,
          callback: () => this.updateImage(CONST.DEFAULT_TOKEN),
        },
      ],
      position: ev,
    });
  }

  private renderIcon({ name, img }: CommonInfo) {
    const hideImg = this.noDefaultImg && img === CONST.DEFAULT_TOKEN;
    if (hideImg && this.disabled) return '';
    return hideImg
      ? html`<mwc-icon-button
          icon="insert_photo"
          class="add-photo"
          data-tooltip="${localize('add')} ${localize('icon')}"
          @mouseover=${tooltip.fromData}
          @focus=${tooltip.fromData}
          @click=${this.editImg}
        ></mwc-icon-button>`
      : html` <button
          class="avatar-button"
          @click=${this.editImg}
          ?disabled=${this.disabled}
          @contextmenu=${this.openResetMenu}
        >
          <img src=${img} class="avatar" alt="Avatar of ${name}" />
        </button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'entity-form-header': EntityFormHeader;
  }
}
