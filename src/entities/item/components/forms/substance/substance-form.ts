import { formatArmorUsed } from '@src/combat/attack-formatting';
import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderRadioFields,
  renderSelectField,
  renderTextareaField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import { Placement } from '@src/components/popover/popover-options';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import {
  AptitudeType,
  DrugAddiction,
  DrugCategory,
  enumValues,
  SubstanceApplicationMethod,
  SubstanceClassification,
  SubstanceType,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import { Sleight } from '@src/entities/item/proxies/sleight';
import { Substance } from '@src/entities/item/proxies/substance';
import { Trait } from '@src/entities/item/proxies/trait';
import { ArmorType } from '@src/features/active-armor';
import { pairList } from '@src/features/check-list';
import type { EffectCreatedEvent } from '@src/features/components/effect-creator/effect-created-event';
import { ConditionType } from '@src/features/conditions';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { CommonInterval, prettyMilliseconds } from '@src/features/time';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { format, localize } from '@src/foundry/localization';
import { formatDamageType, HealthType } from '@src/health/health';
import { tooltip } from '@src/init';
import { notEmpty, withSign } from '@src/utility/helpers';
import {
  customElement,
  html,
  property,
  PropertyValues,
  state,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import {
  createPipe,
  flatMap,
  identity,
  map,
  mapToObj,
  objOf,
  pipe,
} from 'remeda';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './substance-form.scss';

const renderEffectInfo = () => html` <mwc-icon
  slot="info"
  data-ep-tooltip="${localize('traits')} & ${localize('sleights')}"
  @mouseenter=${tooltip.fromData}
  >info</mwc-icon
>`;

const itemKeys = ['traits', 'sleights'] as const;

type Group = 'base' | 'severity';

@customElement('substance-form')
export class SubstanceForm extends ItemFormBase {
  static get is() {
    return 'substance-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: Substance;

  @state() private effectGroup: Group = 'base';

  private baseSheetKeys = new Map<string, {}>();

  private severitySheetKeys = new Map<string, {}>();

  private effectOps = addUpdateRemoveFeature(
    () => this.item.updater.path('system', 'base', 'effects').commit,
  );

  private severityEffectOps = addUpdateRemoveFeature(
    () => this.item.updater.path('system', 'severity', 'effects').commit,
  );

  update(changedProps: PropertyValues<this>) {
    if (!this.item.hasSeverity) {
      this.effectGroup = 'base';
      this.severitySheetKeys.forEach(closeWindow);
      this.severitySheetKeys.clear();
    }
    for (const [id] of this.baseSheetKeys) {
      this.openItemSheet('base', id);
    }
    for (const [id] of this.severitySheetKeys) {
      this.openItemSheet('severity', id);
    }

    super.update(changedProps);
  }

  disconnectedCallback() {
    for (const map of [this.baseSheetKeys, this.severitySheetKeys]) {
      map.forEach(closeWindow);
      map.clear();
    }
    super.disconnectedCallback();
  }

  private openItemSheet(group: Group, id: string) {
    const subItem = this.item[group].items.get(id);
    const map = group === 'base' ? this.baseSheetKeys : this.severitySheetKeys;
    let key = map.get(id);
    if (!key) {
      key = {};
      map.set(id, key);
    }

    if (!subItem) {
      closeWindow(key);
      map.delete(id);
      return;
    }

    const { wasConnected, win } = openWindow(
      {
        key: key,
        content: renderItemForm(subItem),
        adjacentEl: this,
        forceFocus: true,
        name: subItem.fullName,
      },
      { resizable: ResizeOption.Vertical },
    );
    if (!wasConnected) {
      win.addEventListener(SlWindowEventName.Closed, () => map.delete(id), {
        once: true,
      });
    }
  }

  private addCreatedEffect(ev: EffectCreatedEvent) {
    (this.effectGroup === 'base' ? this.effectOps : this.severityEffectOps).add(
      {},
      ev.effect,
    );
  }

  private addItem = handleDrop(async ({ ev, data }) => {
    const isSeverity = (ev.currentTarget as HTMLElement).hasAttribute(
      'data-severity',
    );
    if (this.disabled) return;
    if (data?.type === DropType.Item) {
      const proxy = await itemDropToItemProxy(data);
      const key = isSeverity ? 'severityAppliedItems' : 'baseAppliedItems';
      if (proxy?.type === ItemType.Trait) {
        if (proxy.hasMultipleLevels) {
          proxy.selectLevelAndAdd((data) => this.item.addItemEffect(key, data));
        } else this.item.addItemEffect(key, proxy.getDataCopy());
      } else if (proxy?.type === ItemType.Sleight) {
        this.item.addItemEffect(key, proxy.getDataCopy());
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
      appliedState,
    } = this.item;
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

        ${renderUpdaterForm(updater.path('system'), {
          disabled,
          slot: 'sidebar',
          fields: ({
            category,
            substanceType,
            classification,
            addiction,
            addictionMod,
            hasSeverity,
            consumeOnUse,
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
            renderLabeledCheckbox(consumeOnUse),
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
              ${renderUpdaterForm(updater.path('system'), {
                classes: complexityForm.cssClass,
                disabled,
                fields: renderComplexityFields,
              })}
              ${renderUpdaterForm(updater.path('system'), {
                disabled,
                classes: 'quantity-form',
                fields: ({ quantity, quantityPerCost }) => [
                  loaded || appliedState
                    ? html`<div></div>`
                    : renderNumberField(quantity, { min: 0, max: 9999 }),
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
          .updateActions=${updater.path('system', 'description')}
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
                data-ep-tooltip="${localize('onset')} ${localize(
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
            this.item.updater.path('system', 'application').commit,
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
    const { severity, hasSeverity } = this.item;
    const { disabled } = this;
    return html`
      <sl-dropzone ?disabled=${disabled} @drop=${this.addItem}>
        <sl-header
          heading=${hasSeverity ? `${localize('base')}` : localize('effects')}
        >
          ${renderEffectInfo()} ${this.renderAddEffectButton('base')}
          <mwc-icon-button
            slot="action"
            icon="edit"
            @click=${this.setDrawerFromEvent(this.renderbaseEdit)}
            ?disabled=${disabled}
          ></mwc-icon-button>
        </sl-header>
        <div class="effect-details">${this.renderCommonEffectInfo('base')}</div>
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
                  @click=${this.setDrawerFromEvent(this.renderSeverityEdit)}
                ></mwc-icon-button>
              </sl-header>
              <div class="effect-details">
                ${notEmpty(severity.conditions)
                  ? html`
                      <sl-group label=${localize('conditions')}
                        >${map(severity.conditions, localize).join(
                          ', ',
                        )}</sl-group
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

  private renderAddEffectButton(group: Group) {
    return html` <mwc-icon-button
      slot="action"
      icon="add"
      ?disabled=${this.disabled}
      data-ep-tooltip="${localize('add')} ${localize('effect')}"
      @mouseenter=${tooltip.fromData}
      @focus=${tooltip.fromData}
      @click=${() => {
        this.effectGroup = group;
        this.setDrawer(this.renderEffectCreator);
      }}
    ></mwc-icon-button>`;
  }

  private renderEffectsList(group: Group) {
    const { effects } = this.item[group];
    return notEmpty(effects)
      ? html`<item-form-effects-list
          label=${localize('effects')}
          .effects=${effects}
          .operations=${group === 'base'
            ? this.effectOps
            : this.severityEffectOps}
          ?disabled=${this.disabled}
        ></item-form-effects-list>`
      : '';
  }

  private renderCommonEffectInfo(group: Group) {
    const { duration, wearOffStress, notes, items } = this.item[group];
    const { damageFormula, damageType, perTurn, ...armor } =
      this.item.epData[group].damage;

    const itemGroups = [...items.values()].reduce(
      (accum, item) => {
        const common = {
          embedded: item.embedded,
          alwaysDeletable: item.alwaysDeletable,
          deleteSelf: item.deleteSelf,
          openForm: () => this.openItemSheet(group, item.id),
        };
        if (item.type === ItemType.Trait)
          accum.traits.push(
            new Trait({
              ...common,
              data: item.getDataCopy(),
              lockSource: item.lockSource,
              updater: item.updater,
            }),
          );
        else
          accum.sleights.push(
            new Sleight({
              ...common,
              data: item.getDataCopy(),
              updater: item.updater,
            }),
          );
        return accum;
      },
      { traits: [] as Trait[], sleights: [] as Sleight[] },
    );
    return html`
      ${this.renderEffectsList(group)}
      ${itemKeys.map((key) => {
        const itemGroup = itemGroups[key];
        return notEmpty(itemGroup)
          ? html`
              <form-items-list
                .items=${itemGroup}
                label=${localize(key)}
              ></form-items-list>
            `
          : '';
      })}
      ${damageFormula
        ? html`
            <sl-group
              label="${formatDamageType(damageType)} ${perTurn
                ? localize('perTurn')
                : ''}"
            >
              ${damageFormula} ${formatArmorUsed(armor)}
            </sl-group>
          `
        : ''}
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
              renderRadioFields(group, ['base', 'severity']),
          })
        : ''}

      <effect-creator @effect-created=${this.addCreatedEffect}></effect-creator>
    `;
  }

  private renderbaseEdit() {
    const updater = this.item.updater.path('system', 'base');
    return html`
      <h3>${localize('base')}</h3>
      ${renderUpdaterForm(updater, {
        fields: ({ duration, wearOffStress }) => [
          renderFormulaField(wearOffStress),
          renderTimeField(duration, {
            permanentLabel: localize('indefinite'),
            min: CommonInterval.Turn,
          }),
        ],
      })}
      <p class="label">${localize('damage')}</p>
      ${this.renderEffectDamage('base')}
      ${renderUpdaterForm(updater, {
        fields: ({ notes }) => renderTextareaField(notes),
      })}
    `;
  }

  private renderSeverityEdit() {
    const { conditions } = this.item.severity;
    const updater = this.item.updater.path('system', 'severity');
    return html`
      <h3>${localize('severity')}</h3>
      ${renderUpdaterForm(updater, {
        fields: ({ check, checkMod, duration, wearOffStress }) => [
          html`<div class="check-fields">
            ${[
              renderSelectField(check, enumValues(AptitudeType)),
              renderNumberField(checkMod, { min: -90, max: 90 }),
            ]}
          </div>`,
          renderTimeField(duration, { permanentLabel: localize('indefinite') }),
          renderFormulaField(wearOffStress),
        ],
      })}
      <sl-popover
        padded
        placement=${Placement.Right}
        .renderOnDemand=${() => this.renderConditionsListForm()}
      >
        <wl-list-item slot="base" clickable>
          <span>${localize('apply')} ${localize('conditions')}</span>
          <span class="list-values"
            >${notEmpty(conditions)
              ? map(conditions, localize).join(', ')
              : localize('none')}</span
          >
        </wl-list-item>
      </sl-popover>

      <p class="label">${localize('damage')}</p>
      ${this.renderEffectDamage('severity')}
      ${renderUpdaterForm(updater, {
        fields: ({ notes }) => renderTextareaField(notes),
      })}
    `;
  }

  private renderConditionsListForm() {
    const updater = this.item.updater.path('system', 'severity');
    const [pairedConditions, change] = pairList(
      updater.originalValue().conditions,
      enumValues(ConditionType),
    );

    return renderAutoForm({
      props: pairedConditions,
      update: createPipe(change, objOf('conditions'), updater.commit),
      fields: (conditions) =>
        map(Object.values(conditions), renderLabeledCheckbox),
    });
  }

  private renderEffectDamage(group: Group) {
    const updater = this.item.updater.path('system', group, 'damage');
    const { damage } = this.item[group];
    return html`
      ${renderUpdaterForm(updater, {
        fields: ({
          damageFormula,
          damageType,
          perTurn,
          reduceAVbyDV,
          armorPiercing,
        }) => [
          [
            renderFormulaField(damageFormula),
            renderSelectField(damageType, enumValues(HealthType)),
            renderLabeledCheckbox(perTurn),
            html`
              <p class="label">${localize('armorUsed')}</p>
              ${this.renderArmorUsedForm(group)}
            `,
            notEmpty(damage.armorUsed)
              ? html`
                  <div class="divider"></div>
                  ${[
                    renderLabeledCheckbox(armorPiercing),
                    renderLabeledCheckbox(reduceAVbyDV),
                  ]}
                `
              : '',
          ],
        ],
      })}
    `;
  }

  private renderArmorUsedForm(group: Group) {
    const updater = this.item.updater.path('system', group, 'damage');
    const [pairedArmor, change] = pairList(
      updater.originalValue().armorUsed,
      enumValues(ArmorType),
    );

    return renderAutoForm({
      props: pairedArmor,
      update: createPipe(change, objOf('armorUsed'), updater.commit),
      fields: (armors) => map(Object.values(armors), renderLabeledCheckbox),
    });
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
