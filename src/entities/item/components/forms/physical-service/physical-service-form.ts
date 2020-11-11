import { renderUpdaterForm } from '@src/components/form/forms';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { PhysicalService } from '@src/entities/item/proxies/physical-service';
import { localize } from '@src/foundry/localization';
import { customElement, html, property } from 'lit-element';
import { ItemFormBase } from '../item-form-base';
import styles from './physical-service-form.scss';

@customElement('physical-service-form')
export class PhysicalServiceForm extends ItemFormBase {
  static get is() {
    return 'physical-service-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) item!: PhysicalService;

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
    'physical-service-form': PhysicalServiceForm;
  }
}
