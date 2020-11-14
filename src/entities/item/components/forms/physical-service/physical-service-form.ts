import {
  renderSelectField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { enumValues, PhysicalServiceType } from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { PhysicalService } from '@src/entities/item/proxies/physical-service';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { CommonInterval } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { customElement, html, property } from 'lit-element';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './physical-service-form.scss';

@customElement('physical-service-form')
export class PhysicalServiceForm extends ItemFormBase {
  static get is() {
    return 'physical-service-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: PhysicalService;

  private readonly repOps = addUpdateRemoveFeature(
    () => this.item.updater.prop('data', 'reputations').commit,
  );

  render() {
    const { updater, type, isFakeEgoId } = this.item;
    const { disabled } = this;
    return html`
      <entity-form-layout noSidebar>
        <entity-form-header
          noDefaultImg
          slot="header"
          .updateActions=${updater.prop('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
        </entity-form-header>

        <div slot="details">
          <section>
            <sl-header heading=${localize('details')}></sl-header>
            <div class="detail-forms">
              ${renderUpdaterForm(updater.prop('data'), {
                disabled,
                classes: 'primary-fields-form',
                fields: ({ serviceType, duration }) => [
                  renderSelectField(
                    serviceType,
                    enumValues(PhysicalServiceType),
                  ),
                  renderTimeField(duration, {
                    min: CommonInterval.Turn,
                    permanentLabel: localize('indefinite'),
                  }),
                ],
              })}
              ${renderUpdaterForm(updater.prop('data'), {
                disabled,
                classes: complexityForm.cssClass,
                fields: renderComplexityFields,
              })}
            </div>
          </section>

          ${isFakeEgoId ? this.renderReps() : ''}
        </div>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.prop('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private renderReps() {
    const { reputations } = this.item;
    const { disabled } = this;
    return html`
      <section>
        <sl-header
          heading=${localize('reputations')}
          ?hideBorder=${reputations.length === 0}
        ></sl-header>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'physical-service-form': PhysicalServiceForm;
  }
}
