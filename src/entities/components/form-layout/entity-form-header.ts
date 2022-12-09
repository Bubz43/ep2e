import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import type { EntityPath } from '@src/entities/path';
import type { UpdateActions } from '@src/entities/update-store';
import { closeImagePicker, openImagePicker } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { notEmpty } from '@src/utility/helpers';
import { getDefaultItemIcon } from '@src/utility/images';
import { customElement, html, LitElement, property } from 'lit-element';
import styles from './entity-form-header.scss';

const isItem = (type: string) =>
  !(enumValues(ActorType) as string[]).includes(type);

type CommonInfo = { name: string; img: string; type: string };

/**
 * @slot tag
 * @slot settings
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
    const { originalValue } = this.updateActions;
    openImagePicker(this, originalValue().img, this.updateImage);
  }

  private updateEgoName = ({ name }: { name?: string }) => {
    if (name) this.updateActions.commit({ name });
    else this.requestUpdate();
  };

  private nameInput: FieldPropsRenderer<{ name: string }> = ({ name }) => {
    return renderTextInput(name);
  };

  private openResetMenu(ev: MouseEvent) {
    openMenu({
      content: [
        {
          label: `${localize(this.noDefaultImg ? 'clear' : 'reset')} ${localize(
            'image',
          )}`,
          icon: html`<mwc-icon>clear</mwc-icon>`,
          callback: () =>
            this.updateImage(
              isItem(this.updateActions.originalValue().type)
                ? getDefaultItemIcon()
                : CONST.DEFAULT_TOKEN,
            ),
        },
      ],
      position: ev,
    });
  }

  render() {
    const { name, img, type } = this.updateActions.originalValue();

    return html`
      ${this.renderIcon({ name, img, type })}
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
      <slot name="settings"></slot>
    `;
  }

  private renderIcon({ name, img, type }: CommonInfo) {
    const hideImg =
      this.noDefaultImg &&
      (img === CONST.DEFAULT_TOKEN ||
        (isItem(type) && img === getDefaultItemIcon()));
    if (hideImg && this.disabled) return '';
    return hideImg
      ? html`<mwc-icon-button
          icon="insert_photo"
          class="add-photo"
          data-ep-tooltip="${localize('add')} ${localize('icon')}"
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
