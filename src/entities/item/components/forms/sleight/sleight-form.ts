import { renderUpdaterForm } from '@src/components/form/forms';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import { localize } from '@src/foundry/localization';
import { customElement, html, property } from 'lit-element';
import { ItemFormBase } from '../item-form-base';
import styles from './sleight-form.scss';

@customElement('sleight-form')
export class SleightForm extends ItemFormBase {
  static get is() {
    return 'sleight-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) item!: Sleight;

  render() {
    const { updater, type } = this.item;
    const { disabled } = this;
    return html`
      <entity-form-layout>
        <entity-form-header
          noDefaultImg
          slot="header"
          .updateActions=${updater.path('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
        </entity-form-header>

        ${renderUpdaterForm(updater.path('data'), {
          disabled,
          slot: 'sidebar',
          fields: () => [],
        })}

        <div slot="details"></div>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.path('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sleight-form': SleightForm;
  }
}
