import { renderUpdaterForm } from '@src/components/form/forms';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { Software } from '@src/entities/item/proxies/software';
import { localize } from '@src/foundry/localization';
import { customElement, html, property } from 'lit-element';
import { ItemFormBase } from '../item-form-base';
import styles from './software-form.scss';

@customElement('software-form')
export class SoftwareForm extends ItemFormBase {
  static get is() {
    return 'software-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) item!: Software;

  render() {
    const { updater, type } = this.item;
    const { disabled } = this;
    return html`
      <entity-form-layout>
        <entity-form-header
          noDefaultImg
          slot="header"
          .updateActions=${updater.prop('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
        </entity-form-header>

        ${renderUpdaterForm(updater.prop('data'), {
          disabled,
          slot: 'sidebar',
          fields: () => [],
        })}

        <div slot="details"></div>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.prop('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'software-form': SoftwareForm;
  }
}
