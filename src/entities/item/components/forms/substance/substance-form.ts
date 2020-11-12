import { formatArmorUsed } from '@src/combat/attack-formatting';
import {
  renderNumberField,
  renderLabeledCheckbox,
  renderSelectField,
  renderTextField,
  renderRadioFields,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import {
  enumValues,
  SubstanceType,
  SubstanceClassification,
  DrugCategory,
  DrugAddiction,
  SubstanceApplicationMethod,
  AptitudeType,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { Substance } from '@src/entities/item/proxies/substance';
import type { EffectCreatedEvent } from '@src/features/components/effect-creator/effect-created-event';
import { formatEffect } from '@src/features/effects';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { prettyMilliseconds } from '@src/features/time';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { format, localize } from '@src/foundry/localization';
import { formatDamageType } from '@src/health/health';
import { tooltip } from '@src/init';
import { notEmpty, withSign } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  property,
  PropertyValues,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { flatMap, identity, map, mapToObj, pipe } from 'remeda';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './substance-form.scss';

const renderEffectInfo = () => html` <mwc-icon
  slot="info"
  data-tooltip="${localize('traits')} & ${localize('sleights')}"
  @mouseenter=${tooltip.fromData}
  >info</mwc-icon
>`;

@customElement('substance-form')
export class SubstanceForm extends ItemFormBase {
  static get is() {
    return 'substance-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: Substance;

  @internalProperty() effectGroup: 'alwaysApplied' | 'severity' =
    'alwaysApplied';

  private effectOps = addUpdateRemoveFeature(
    () => this.item.updater.prop('data', 'alwaysApplied', 'effects').commit,
  );

  private severityEffectOps = addUpdateRemoveFeature(
    () => this.item.updater.prop('data', 'severity', 'effects').commit,
  );

  update(changedProps: PropertyValues) {
    if (!this.item.hasSeverity) this.effectGroup = 'alwaysApplied';
    super.update(changedProps);
  }

  private addCreatedEffect(ev: EffectCreatedEvent) {
    (this.effectGroup === 'alwaysApplied'
      ? this.effectOps
      : this.severityEffectOps
    ).add({}, ev.effect);
  }

  private addItem = handleDrop(async ({ ev, data }) => {
    const isSeverity = (ev.currentTarget as HTMLElement).hasAttribute(
      'data-severity',
    );
    if (this.disabled) return;
    if (data?.type === DropType.Item) {
      const proxy = await itemDropToItemProxy(data);
      const key = isSeverity ? 'severityAppliedItems' : 'alwaysAppliedItems';
      if (proxy?.type === ItemType.Trait) {
        if (proxy.hasMultipleLevels) {
          proxy.selectLevelAndAdd(data => this.item.addItemEffect(key, data))
        } else this.item.addItemEffect(key, proxy.getDataCopy())
      } else if (proxy?.type === ItemType.Sleight) {
        this.item.addItemEffect(key, proxy.getDataCopy())
      }
    }
  });

  render() {
    const {
      updater,
      type,
      isChemical,
      isAddictive,
      isDrug,
      loaded,
    } = this.item;
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
            addiction,
            addictionMod,
            hasSeverity,
          }) => [
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
            renderLabeledCheckbox(hasSeverity),
            isDrug
              ? html`
                  ${this.drugCategoryTemplate}
                  <entity-form-sidebar-divider></entity-form-sidebar-divider>
                  ${renderSelectField(addiction, enumValues(DrugAddiction), {
                    emptyText: localize('nonAddictive'),
                  })}
                  ${isAddictive
                    ? renderNumberField(
                        {
                          ...addictionMod,
                          label: `${localize(
                            AptitudeType.Willpower,
                          )} ${localize('check')} ${localize(
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
                    : ''}
                `
              : '',
          ],
        })}

        <div slot="details">
          <section>
            <sl-header heading=${localize('details')}></sl-header>
            <div class="detail-forms">
              ${renderUpdaterForm(updater.prop('data'), {
                classes: complexityForm.cssClass,
                disabled,
                fields: renderComplexityFields,
              })}
              ${renderUpdaterForm(updater.prop('data'), {
                disabled,
                classes: 'quantity-form',
                fields: ({ quantity, quantityPerCost }) => [
                  loaded
                    ? html`<div></div>`
                    : renderNumberField(quantity, { min: 0 }),
                  renderNumberField(quantityPerCost, { min: 1 }),
                ],
              })}
            </div>
          </section>
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
                )}: ${prettyMilliseconds(Substance.onsetTime(method), {
                  compact: false,
                })}"
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
        fields: (methods) =>
          enumValues(SubstanceApplicationMethod).map((method) =>
            renderLabeledCheckbox(methods[method], {
              disabled: application.length === 1 && applicationObj[method],
            }),
          ),
      })}
    `;
  }

  private renderEffects() {
    const { severity, hasSeverity, alwaysApplied } = this.item;
    const { disabled } = this;
    return html`
      <sl-dropzone ?disabled=${disabled} @drop=${this.addItem}>
        <sl-header
          heading=${hasSeverity
            ? `${localize('alwaysApplied')}`
            : localize('effects')}
        >
          ${renderEffectInfo()} ${this.renderAddEffectButton('alwaysApplied')}
          <mwc-icon-button
            slot="action"
            icon="edit"
            ?disabled=${disabled}
          ></mwc-icon-button>
        </sl-header>
        <div class="effect-details">
          ${notEmpty(alwaysApplied.effects)
            ? html`
                <item-form-effects-list
                  label=${localize('effects')}
                  .effects=${alwaysApplied.effects}
                  .operations=${this.effectOps}
                  ?disabled=${disabled}
                ></item-form-effects-list>
              `
            : ''}
          ${this.renderCommonEffectInfo('alwaysApplied')}
        </div>
      </sl-dropzone>

      ${hasSeverity
        ? html`
            <sl-dropzone
              ?disabled=${disabled}
              data-severity
              @drop=${this.addItem}
            >
              <sl-header>
                <span slot="heading" class="severity-header"
                  >${format('OnCheckFailure', {
                    aptitude: `${localize('FULL', severity.check)} ${
                      severity.checkMod ? withSign(severity.checkMod) : ''
                    }`,
                  })}</span
                >
                ${renderEffectInfo()} ${this.renderAddEffectButton('severity')}
                <mwc-icon-button
                  slot="action"
                  icon="edit"
                  ?disabled=${disabled}
                ></mwc-icon-button>
              </sl-header>
              <div class="effect-details">
                ${notEmpty(severity.effects)
                  ? html`
                      <item-form-effects-list
                        label=${localize('effects')}
                        .effects=${severity.effects}
                        .operations=${this.severityEffectOps}
                        ?disabled=${disabled}
                      ></item-form-effects-list>
                    `
                  : ''}
                ${notEmpty(severity.conditions)
                  ? html`
                      <sl-group
                        label="${localize('apply')} ${localize('conditions')}"
                        >${map(severity.conditions, localize)}</sl-group
                      >
                    `
                  : ''}
                ${this.renderCommonEffectInfo('severity')}
              </div>
            </sl-dropzone>
          `
        : ''}
    `;
  }

  private renderAddEffectButton(group: 'alwaysApplied' | 'severity') {
    return html` <mwc-icon-button
      slot="action"
      icon="add"
      ?disabled=${this.disabled}
      data-tooltip="${localize('add')} ${localize('effect')}"
      @mouseenter=${tooltip.fromData}
      @focus=${tooltip.fromData}
      @click=${() => {
        this.effectGroup = group;
        this.setDrawer(this.renderEffectCreator);
      }}
    ></mwc-icon-button>`;
  }

  private renderCommonEffectInfo(group: 'alwaysApplied' | 'severity') {
    const {
      duration,
      wearOffStress,
      effects,
      items,
      damage,
      notes,
    } = this.item[group];
    const { damageFormula, damageType, perTurn, ...armor } = damage;

    return html`
      ${damageFormula
        ? html`
            <sl-group label=${formatDamageType(damageType)}>
              ${damageFormula} ${formatArmorUsed(armor)}
              ${perTurn ? `${localize('perTurn')}` : ''}
            </sl-group>
          `
        : ''}
      <!-- ${items.length + effects.length
        ? html`
            <ul>
              ${items.map(
                (item) =>
                  html`<li>
                    ${item.fullName}
                    <span class="item-type"
                      >${item.type === ItemType.Trait
                        ? localize(item.type)
                        : item.fullType}</span
                    >
                  </li>`,
              )}
              ${effects.map((effect) => html`<li>${formatEffect(effect)}</li>`)}
            </ul>
          `
        : ''} -->
      ${notes
        ? html` <sl-group label=${localize('notes')}>${notes}</sl-group> `
        : ''}

      <sl-group label=${localize('duration')}
        >${prettyMilliseconds(duration, { compact: false })}
        ${wearOffStress
          ? `(${format('TakeSVWhenWearsOff', {
              wearOffStress,
              substanceType: localize(
                this.item.substanceType,
              ).toLocaleLowerCase(),
            })})`
          : ''}</sl-group
      >
    `;
  }

  private renderEffectCreator() {
    return html`
      <h3>${localize('add')} ${localize('effect')}</h3>
      ${this.item.hasSeverity
        ? renderAutoForm({
            props: { group: this.effectGroup },
            update: ({ group }) => group && (this.effectGroup = group),
            fields: ({ group }) =>
              renderRadioFields(group, ['alwaysApplied', 'severity']),
          })
        : ''}

      <effect-creator @effect-created=${this.addCreatedEffect}></effect-creator>
    `;
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
