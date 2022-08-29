import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import {
  renderSubmitForm,
  renderUpdaterForm,
} from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import type { Biological } from '@src/entities/actor/proxies/biological';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { ItemProxy } from '@src/entities/item/item';
import { renderMovementRateFields } from '@src/features/components/movement-rate-fields';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { defaultMovement } from '@src/features/movement';
import { Size } from '@src/features/size';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
  setDragDrop,
} from '@src/foundry/drag-and-drop';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property, TemplateResult } from 'lit-element';
import { renderPoolEditForm } from '../pools/pool-edit-form';
import { SleeveFormBase } from '../sleeve-form-base';
import styles from './biological-form.scss';

const itemGroupKeys = ['ware', 'traits'] as const;

@customElement('biological-form')
export class BiologicalForm extends SleeveFormBase {
  static get is() {
    return 'biological-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) sleeve!: Biological;

  private movementOperations = addUpdateRemoveFeature(
    () => this.sleeve.updater.path('system', 'movementRates').commit,
  );

  private handleItemDrop = handleDrop(async ({ data }) => {
    if (data?.type === DropType.Item) {
      this.sleeve.addNewItemProxy(await itemDropToItemProxy(data));
    } else
      notify(
        NotificationType.Info,
        localize('DESCRIPTIONS', 'OnlyPhysicalMorphItems'),
      );
  });

  render() {
    const {
      updater,
      disabled,
      itemGroups,
      pools,
      physicalHealth,
      type,
      sleeved,
      itemTrash,
      movementRates,
      availableBrains,
      nonDefaultBrain,
    } = this.sleeve;
    const { movementEffects } = itemGroups.effects;

    return html`
      <entity-form-layout>
        <entity-form-header
          slot="header"
          .updateActions=${updater.path('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
          ${sleeved ? html` <li slot="tag">${localize('sleeved')}</li> ` : ''}
        </entity-form-header>

        ${renderUpdaterForm(updater.path('system'), {
          disabled,
          slot: 'sidebar',
          fields: ({
            size,
            subtype,
            sex,
            isSwarm,
            reach,
            unarmedDV,
            prehensileLimbs,
            brain,
          }) => [
            notEmpty(availableBrains)
              ? html`
                  ${renderSelectField(brain, [...availableBrains.keys()], {
                    emptyText: localize('default'),
                    altLabel: (key) => availableBrains.get(key)!.fullName,
                  })}
                  <entity-form-sidebar-divider></entity-form-sidebar-divider>
                `
              : '',
            renderTextField(subtype),
            renderTextField(sex),
            html`<entity-form-sidebar-divider></entity-form-sidebar-divider>`,
            renderLabeledCheckbox(isSwarm, {
              tooltipText: localize('DESCRIPTIONS', 'AppliesSwarmRules'),
            }),
            renderSelectField(size, enumValues(Size)),
            html`<entity-form-sidebar-divider></entity-form-sidebar-divider>`,
            isSwarm.value
              ? ''
              : [
                  renderNumberField(prehensileLimbs, { min: 0 }),
                  renderNumberField(reach, { min: 0, max: 30, step: 10 }),
                ],
            renderFormulaField(unarmedDV),
          ],
        })}

        <div slot="details">
          <sleeve-form-acquisition
            .updateActions=${updater.path('system', 'acquisition')}
            ?disabled=${disabled}
          ></sleeve-form-acquisition>
          <sleeve-form-pools
            .poolData=${pools}
            .poolBonuses=${itemGroups.effects.poolBonuses}
            ?disabled=${disabled}
            .editFn=${this.setDrawerFromEvent(this.renderPoolEdit)}
          ></sleeve-form-pools>

          <section>
            <sl-header heading=${localize('physicalHealth')}>
              <mwc-icon-button
                slot="action"
                data-tooltip=${localize('changes')}
                @mouseover=${tooltip.fromData}
                @focus=${tooltip.fromData}
                icon="change_history"
                @click=${this.setDrawerFromEvent(
                  this.renderPhysicalHealthChangeHistory,
                  false,
                )}
              ></mwc-icon-button>
            </sl-header>
            <health-item
              clickable
              ?disabled=${disabled}
              .health=${physicalHealth}
              @click=${this.setDrawerFromEvent(this.renderPhysicalHealthEdit)}
            ></health-item>
          </section>

          ${nonDefaultBrain
            ? html`
                <section>
                  <sl-header heading=${localize('meshHealth')}>
                    <mwc-icon-button
                      slot="action"
                      data-tooltip=${localize('changes')}
                      @mouseover=${tooltip.fromData}
                      @focus=${tooltip.fromData}
                      icon="change_history"
                      @click=${this.setDrawerFromEvent(
                        this.renderMeshHealthChangeHistory,
                        false,
                      )}
                    ></mwc-icon-button>
                  </sl-header>
                  <health-item
                    clickable
                    ?disabled=${disabled}
                    .health=${nonDefaultBrain.meshHealth}
                    @click=${this.setDrawerFromEvent(this.renderMeshHealthEdit)}
                    ><span slot="source"
                      >${nonDefaultBrain.fullName}</span
                    ></health-item
                  >
                  <health-item
                    clickable
                    ?disabled=${disabled}
                    .health=${nonDefaultBrain.firewallHealth}
                    @click=${this.setDrawerFromEvent(
                      this.renderFirewallHealthEdit,
                    )}
                  >
                  </health-item>
                </section>
              `
            : ''}

          <section>
            <sl-header heading=${localize('movementRates')}>
              <mwc-icon-button
                slot="action"
                icon="add"
                ?disabled=${disabled}
                @click=${this.setDrawerFromEvent(this.renderMovementCreator)}
              ></mwc-icon-button>
            </sl-header>
            <sleeve-form-movement-list
              .movementRates=${movementRates}
              .effects=${movementEffects}
              .operations=${this.movementOperations}
              ?disabled=${disabled}
            ></sleeve-form-movement-list>
          </section>

          <sl-dropzone @drop=${this.handleItemDrop} ?disabled=${disabled}>
            <sl-header
              heading="${localize('traits')} & ${localize(
                'installed',
              )} ${localize('ware')}"
            >
              <mwc-icon
                slot="info"
                data-tooltip=${localize(
                  'DESCRIPTIONS',
                  'OnlyPhysicalMorphItems',
                )}
                @mouseover=${tooltip.fromData}
                >info</mwc-icon
              >
              ${notEmpty(itemTrash) && !disabled
                ? html`
                    <mwc-icon-button
                      @click=${this.setDrawerFromEvent(this.renderItemTrash)}
                      icon="delete_outline"
                      slot="action"
                    ></mwc-icon-button>
                  `
                : ''}
            </sl-header>

            ${itemGroupKeys.map((key) => {
              const group = itemGroups[key];
              return notEmpty(group)
                ? html`
                    <form-items-list
                      .dragStartHandler=${this.itemDragStart}
                      .items=${group}
                      label=${localize(key)}
                    ></form-items-list>
                  `
                : '';
            })}
          </sl-dropzone>
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

  private renderMovementCreator() {
    return html`
      <h3>${localize('add')} ${localize('movement')}</h3>

      ${renderSubmitForm({
        props: defaultMovement,
        update: this.movementOperations.add,
        fields: renderMovementRateFields,
        noDebounce: true,
        submitEmpty: true,
      })}
    `;
  }

  private renderItemTrash() {
    return html`
      <h3>${localize('deleted')} ${localize('items')}</h3>
      <item-trash .proxy=${this.sleeve}></item-trash>
    `;
  }

  private renderPhysicalHealthChangeHistory() {
    const { physicalHealth, disabled } = this.sleeve;
    return this.renderHealthHistorySection(html` <health-log
      .health=${physicalHealth}
      ?disabled=${disabled}
    ></health-log>`);
  }

  private renderMeshHealthChangeHistory() {
    const { nonDefaultBrain, disabled } = this.sleeve;
    return this.renderHealthHistorySection(html`
      ${nonDefaultBrain
        ? html` <health-log
            .health=${nonDefaultBrain.meshHealth}
            ?disabled=${disabled}
          ></health-log>`
        : ''}
    `);
  }

  private renderHealthHistorySection(log: TemplateResult) {
    return html`
      <section class="history">
        <h3>${localize('history')}</h3>
        ${log}
      </section>
    `;
  }

  private renderPhysicalHealthEdit() {
    const { physicalHealth, updater } = this.sleeve;
    return html`
      <h3>${localize('physicalHealth')}</h3>
      ${renderUpdaterForm(updater.path('system', 'physicalHealth'), {
        fields: ({ baseDurability }) =>
          renderNumberField(baseDurability, { min: 1 }),
      })}
      <health-state-form .health=${physicalHealth}></health-state-form>
      <health-regen-settings-form
        .health=${physicalHealth}
        .regenUpdater=${updater.path('system', 'physicalHealth').nestedStore()}
      ></health-regen-settings-form>
    `;
  }

  private renderMeshHealthEdit() {
    const { nonDefaultBrain } = this.sleeve;
    if (!nonDefaultBrain) return html``;
    const { updater, meshHealth } = nonDefaultBrain;
    return html`
      <h3>${localize('meshHealth')}</h3>
      ${renderUpdaterForm(updater.path('system', 'meshHealth'), {
        fields: ({ baseDurability }) =>
          renderNumberField(baseDurability, { min: 1 }),
      })}
      <health-state-form .health=${meshHealth}></health-state-form>
      <health-regen-settings-form
        .health=${meshHealth}
        .regenUpdater=${updater.path('system', 'meshHealth').nestedStore()}
      ></health-regen-settings-form>
    `;
  }

  private renderFirewallHealthEdit() {
    const { nonDefaultBrain } = this.sleeve;

    // TODO figure out better types so I don't have to do this nonsense
    if (nonDefaultBrain) {
      const { updater, firewallHealth } = nonDefaultBrain;
      return html`
        <h3>${nonDefaultBrain.name} ${localize('firewallHealth')}</h3>
        ${renderUpdaterForm(updater.path('system', 'firewallHealth'), {
          fields: ({ baseDurability }) =>
            renderNumberField(baseDurability, { min: 1 }),
        })}
        <health-state-form .health=${firewallHealth}></health-state-form>
      `;
    }
    return html``;
  }

  private renderPoolEdit() {
    return html`
      <h3>${localize('pools')}</h3>
      ${renderPoolEditForm(this.sleeve.updater.path('system', 'pools'))}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'biological-form': BiologicalForm;
  }
}
