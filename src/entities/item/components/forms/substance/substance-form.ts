import {
  renderNumberField,
  renderLabeledCheckbox,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import {
  enumValues,
  SubstanceType,
  SubstanceClassification,
  DrugCategory,
  DrugAddiction,
  SubstanceApplicationMethod,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { Substance } from '@src/entities/item/proxies/substance';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { flatMap, identity, map, mapToObj, pipe } from 'remeda';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './substance-form.scss';

@customElement('substance-form')
export class SubstanceForm extends ItemFormBase {
  static get is() {
    return 'substance-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: Substance;

  private effectOps = addUpdateRemoveFeature(
    () => this.item.updater.prop('data', 'alwaysApplied', 'effects').commit,
  );

  private severityEffectOps = addUpdateRemoveFeature(
    () => this.item.updater.prop('data', 'severity', 'effects').commit,
  );

  render() {
    const { updater, type, isChemical, isAddictive, isDrug } = this.item;
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
          fields: ({
            category,
            substanceType,
            classification,
            quantityPerCost,
            addiction,
            addictionMod,
            quantity,
            hasSeverity,
          }) => [
            this.item.loaded ? '' : renderNumberField(quantity, { min: 0 }),
            renderLabeledCheckbox(hasSeverity),
            html` <form-sidebar-divider></form-sidebar-divider> `,
            renderSelectField(
              { ...substanceType, label: localize('type') },
              enumValues(SubstanceType),
            ),
            isChemical
              ? ''
              : renderSelectField(
                  classification,
                  enumValues(SubstanceClassification),
                ),
            renderTextField(category, { listId: 'drug-categories' }),
            renderNumberField(quantityPerCost, { min: 1 }),
            isDrug
              ? html`
                  ${this.drugCategoryTemplate}
                  <form-sidebar-divider></form-sidebar-divider>
                `
              : '',
            renderSelectField(addiction, enumValues(DrugAddiction), {
              emptyText: localize('nonAddictive'),
            }),
            isAddictive
              ? renderNumberField(
                  {
                    ...addictionMod,
                    label: `${localize('check')} ${localize(
                      'SHORT',
                      'modifier',
                    )}`,
                  },
                  {
                    min: -60,
                    max: 60,
                    step: 5,
                  },
                )
              : '',
          ],
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.prop('data'), {
            classes: complexityForm.cssClass,
            disabled,
            fields: renderComplexityFields,
          })}
          ${isChemical ? '' : html` ${this.renderApplicationMethods()} `}
          ${this.renderEffects()}
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

  private renderApplicationMethods() {
    return html`
      <section>
        <sl-header heading=${localize('applicationMethods')}>
          ${this.item.isElectronic
            ? ''
            : html`
                <mwc-icon-button
                  ?disabled=${this.disabled}
                  icon="edit"
                  slot="action"
                  @click=${this.setDrawerFromEvent(
                    this.renderApplicationMethodSelector,
                  )}
                ></mwc-icon-button>
              `}
        </sl-header>
        <sl-animated-list class="application-methods">
          ${repeat(
            this.item.applicationMethods,
            identity,
            (method) =>
              html`<li
                class="method"
                data-tooltip="${localize('onset')} ${localize(
                  'time',
                )}: ${Substance.onsetTime(method)}"
                @mouseenter=${tooltip.fromData}
              >
                ${localize(method)}
              </li>`,
          )}
        </sl-animated-list>
      </section>
    `;
  }

  private renderApplicationMethodSelector() {
    const { application } = this.item.epData;
    const applicationObj = mapToObj(
      enumValues(SubstanceApplicationMethod),
      (method) => [method, application.includes(method)],
    );
    return html`
      <h3>${localize('applicationMethods')}</h3>
      ${renderAutoForm({
        props: applicationObj,
        update: (methods) =>
          pipe(
            enumValues(SubstanceApplicationMethod),
            flatMap((method) => {
              const active = methods[method] ?? applicationObj[method];
              return active ? method : [];
            }),
            this.item.updater.prop('data', 'application').commit,
          ),
        fields: (methods) => map(Object.values(methods), renderLabeledCheckbox)
      })}
    `;
  }

  private renderEffects() {
    return html``;
  }

  private drugCategoryTemplate = html`<datalist id="drug-categories">
    ${enumValues(DrugCategory).map(
      (category) => html` <option value=${localize(category)}></option> `,
    )}
  </datalist>`;
}

declare global {
  interface HTMLElementTagNameMap {
    'substance-form': SubstanceForm;
  }
}
