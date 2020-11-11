import { renderUpdaterForm } from '@src/components/form/forms';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { Trait } from '@src/entities/item/proxies/trait';
import { localize } from '@src/foundry/localization';
import { customElement, html, property } from 'lit-element';
import { ItemFormBase } from '../item-form-base';
import styles from './trait-form.scss';

@customElement('trait-form')
export class TraitForm extends ItemFormBase {
  static get is() {
    return 'trait-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) item!: Trait;


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
    'trait-form': TraitForm;
  }
}
