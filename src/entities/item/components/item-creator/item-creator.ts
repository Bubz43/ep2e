import {
  renderLabeledCheckbox,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import type { Form } from '@src/components/form/form';
import { renderAutoForm } from '@src/components/form/forms';
import type { SubmitButton } from '@src/components/submit-button/submit-button';
import { enumValues } from '@src/data-enums';
import { ItemType } from '@src/entities/entity-types';
import { mutateEntityHook, MutateEvent } from '@src/foundry/hook-setups';
import { localize } from '@src/foundry/localization';
import { notEmpty, safeMerge } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  query,
  PropertyValues,
  eventOptions,
} from 'lit-element';
import { flatMapToObj, sortBy } from 'remeda';
import type { ItemProxy } from '../../item';
import styles from './item-creator.scss';
import { ItemDataEvent } from './item-data-event';

/**
 * @fires item-data
 */
@customElement('item-creator')
export class ItemCreator extends LitElement {
  static get is() {
    return 'item-creator' as const;
  }

  static styles = [styles];

  @property({ type: String }) folder?: string;

  @property({ type: Array }) allowedTypes?: ItemType[];

  @property({ type: Boolean }) hideDescription = false;

  @property({ type: Boolean }) showFolders = false;

  @query('.item-data-form') private itemForm!: Form;

  @query('submit-button') private submitButton!: SubmitButton;

  private options = {
    renderSheet: true,
    closeOnCreate: true,
  };

  @internalProperty() private itemData: {
    name: string;
    type: ItemType;
    folder: string;
  } = {
    name: '',
    type: ItemType.PhysicalTech,
    folder: '',
  };

  async connectedCallback() {
    super.connectedCallback();
    await this.updateComplete;
    this.focusFirstInput();
    this.toggleHooks('on');
  }

  disconnectedCallback() {
    this.toggleHooks('off');
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues) {
    if (changedProps.has('allowedTypes')) {
      this.setInitialType();
    }
    if (changedProps.has('folder')) {
      this.itemData.folder = this.folder || '';
    }
    super.update(changedProps);
  }

  updated(changedProps: PropertyValues) {
    if (changedProps.has('folder')) {
      this.focusFirstInput();
    }
    super.updated(changedProps);
  }

  private toggleHooks(hook: 'on' | 'off') {
    for (const event of [
      MutateEvent.Create,
      MutateEvent.Update,
      MutateEvent.Delete,
    ]) {
      mutateEntityHook({
        entity: Folder,
        hook,
        event,
        callback: this.updateFromHook,
      });
    }
  }

  private updateFromHook = () => this.requestUpdate();

  private setInitialType() {
    if (notEmpty(this.allowedTypes)) this.itemData.type = this.allowedTypes[0];
  }

  private focusFirstInput() {
    requestAnimationFrame(() => {
      this.renderRoot.querySelector('sl-field')?.input?.focus();
    });
  }

  private emitItemData() {
    this.dispatchEvent(
      new ItemDataEvent({
        data: { ...this.itemData, folder: this.showFolders ? this.folder : '' },
        options: { renderSheet: this.options.renderSheet },
      }),
    );
    if (this.options.closeOnCreate)
      this.dispatchEvent(
        new CustomEvent('close-creator', { bubbles: true, composed: true }),
      );
    this.itemData = { ...this.itemData, name: '' };
  }

  private get folders() {
    return flatMapToObj([...game.folders], ({ displayed, data }) =>
      data.type === 'Item' && displayed ? [[data._id, data.name]] : [],
    );
  }

  private updateOptions = (options: Partial<ItemCreator['options']>) => {
    this.options = safeMerge(this.options, options);
  };

  private updateItemData = (data: Partial<ItemCreator['itemData']>) => {
    this.itemData = safeMerge(this.itemData, data);
  };

  @eventOptions({ capture: true })
  private clickSubmit(ev: KeyboardEvent) {
    if (ev.key === 'Enter') {
      this.submitButton?.click();
    }
  }

  render() {
    const ready = !!this.itemData.name;
    const { folders } = this;
    // TODO Quick item type descriptions
    return html`
      <div class="form-wrapper" @keydown=${this.clickSubmit}>
        ${renderAutoForm({
          classes: 'item-data-form',
          props: this.itemData,
          storeOnInput: true,
          noDebounce: true,
          update: this.updateItemData,
          fields: ({ type, name, folder }) => [
            this.allowedTypes?.length === 1
              ? ''
              : renderSelectField(
                  type,
                  sortBy(
                    notEmpty(this.allowedTypes)
                      ? this.allowedTypes
                      : enumValues(ItemType),
                    localize,
                  ),
                ),
            renderTextField(name, { required: true }),
            notEmpty(folders) && this.showFolders
              ? renderSelectField(folder, Object.keys(folders), {
                emptyText: "-",
                  altLabel: (id) => folders[id],
                })
              : '',
          ],
        })}
      </div>

      ${renderAutoForm({
        classes: 'options-form',
        props: this.options,
        update: this.updateOptions,
        fields: ({ renderSheet, closeOnCreate }) => [
          renderLabeledCheckbox(renderSheet),
          renderLabeledCheckbox({
            ...closeOnCreate,
            label: `${localize('close')} ${localize('on')} ${localize(
              'create',
            )}`,
          }),
        ],
      })}

      <submit-button
        class="create-button"
        label="${localize('create')} ${localize(this.itemData.type)}"
        ?complete=${ready}
        @submit-attempt=${() => {
          this.itemForm.IsValid({ report: true });
          if (ready) this.emitItemData();
        }}
      ></submit-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-creator': ItemCreator;
  }
}
