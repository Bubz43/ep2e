import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import {
  renderAutoForm,
  renderSubmitForm,
  renderUpdaterForm,
} from '@src/components/form/forms';
import { BotType, enumValues, ShellType, VehicleType } from '@src/data-enums';
import type { SyntheticShell } from '@src/entities/actor/proxies/synthetic-shell';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { UpdateStore } from '@src/entities/update-store';
import { renderMovementRateFields } from '@src/features/components/movement-rate-fields';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { defaultMovement } from '@src/features/movement';
import { Size } from '@src/features/size';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import type { HealsOverTime } from '@src/health/recovery';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property, TemplateResult } from 'lit-element';
import { first } from 'remeda';
import { renderPoolEditForm } from '../pools/pool-edit-form';
import { SleeveFormBase } from '../sleeve-form-base';
import styles from './synthetic-form.scss';

const itemGroupKeys = ['ware', 'software', 'traits'] as const;
const frames = ['light', 'medium', 'heavy'] as const;

@customElement('synthetic-form')
export class SyntheticForm extends SleeveFormBase {
  static get is() {
    return 'synthetic-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) sleeve!: SyntheticShell;

  private movementOperations = addUpdateRemoveFeature(
    () => this.sleeve.updater.prop('data', 'movementRates').commit,
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

  private getShellTypeGroup(
    shellType: ShellType,
  ): readonly (BotType | VehicleType)[] | null {
    switch (shellType) {
      case ShellType.Bot:
        return enumValues(BotType);
      case ShellType.Vehicle:
        return enumValues(VehicleType);

      default:
        return null;
    }
  }

  render() {
    const {
      updater,
      disabled,
      itemGroups,
      pools,
      physicalHealth,
      activeMeshHealth,
      type,
      sleeved,
      itemTrash,
      movementRates,
      availableBrains,
      nonDefaultBrain,
      activeFirewallHealth,
    } = this.sleeve;
    const { movementEffects } = itemGroups.effects;
    const { originalValue, commit } = updater.prop('data');

    return html`
      <entity-form-layout>
        <entity-form-header
          slot="header"
          .updateActions=${updater.prop('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
          ${sleeved ? html` <li slot="tag">${localize('sleeved')}</li> ` : ''}
        </entity-form-header>

        ${renderAutoForm({
          props: originalValue(),
          disabled,
          slot: 'sidebar',
          update: ({ shellType, ...props }) => {
            commit(
              shellType
                ? {
                    shellType,
                    subtype:
                      first(this.getShellTypeGroup(shellType) || []) || '',
                    isSwarm:
                      shellType === ShellType.Vehicle ? false : undefined,
                  }
                : props,
            );
          },
          fields: ({
            size,
            subtype,
            isSwarm,
            reach,
            unarmedDV,
            prehensileLimbs,
            brain,
            passengers,
            shellType,
            firewallRating,
          }) => {
            const subtypes = this.getShellTypeGroup(shellType.value);

            return [
              notEmpty(availableBrains)
                ? html`
                    ${renderSelectField(brain, [...availableBrains.keys()], {
                      emptyText: localize('default'),
                      altLabel: (key) => availableBrains.get(key)!.fullName,
                    })}
                    <entity-form-sidebar-divider></entity-form-sidebar-divider>
                  `
                : '',
              renderSelectField(shellType, enumValues(ShellType)),
              nonDefaultBrain
                ? ''
                : renderNumberField(firewallRating, { min: 1, max: 99 }),
              notEmpty(subtypes)
                ? html`
                    ${renderSelectField(subtype, subtypes)}
                    <entity-form-sidebar-divider></entity-form-sidebar-divider>
                  `
                : '',
              shellType.value === ShellType.Vehicle
                ? renderNumberField(passengers, { min: 1 })
                : renderLabeledCheckbox(isSwarm, {
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
            ];
          },
        })}

        <div slot="details">
          <sleeve-form-acquisition
            .updateActions=${updater.prop('data', 'acquisition')}
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
            ${renderUpdaterForm(updater.prop('data', 'inherentArmor'), {
              disabled,
              classes: 'inherent-armor',
              fields: ({ energy, kinetic, source }) => [
                renderTextField(
                  {
                    ...source,
                    label: `${localize('armor')} ${localize('source')}`,
                  },
                  { listId: 'frames' },
                ),
                renderNumberField(energy, { min: 0 }),
                renderNumberField(kinetic, { min: 0 }),
              ],
            })}
            ${this.frameList}
          </section>

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
              .health=${activeMeshHealth}
              @click=${this.setDrawerFromEvent(this.renderMeshHealthEdit)}
            >
              ${nonDefaultBrain
                ? html` <span slot="source">${nonDefaultBrain.fullName}</span> `
                : ''}
            </health-item>

            <health-item
              clickable
              ?disabled=${disabled}
              .health=${activeFirewallHealth}
              @click=${this.setDrawerFromEvent(this.renderFirewallHealthEdit)}
            >
            </health-item>
          </section>

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
          .updateActions=${updater.prop('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private frameList = html` <datalist id="frames">
    ${frames.map(
      (frameType) => html`
        <option value="${localize(frameType)} ${localize('frame')}"></option>
      `,
    )}
  </datalist>`;

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
    const { activeMeshHealth, disabled, activeFirewallHealth } = this.sleeve;
    return this.renderHealthHistorySection(html`
        <h4>${localize("meshHealth")}</h4>
        <health-log
          .health=${activeMeshHealth}
          ?disabled=${disabled}
        ></health-log>
        <h4>${localize("firewallHealth")}</h4>
        <health-log
          .health=${activeFirewallHealth}
          ?disabled=${disabled}
        ></health-log>
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
      ${renderUpdaterForm(updater.prop('data', 'physicalHealth'), {
        fields: ({ baseDurability }) =>
          renderNumberField(baseDurability, { min: 1 }),
      })}
      <health-state-form .health=${physicalHealth}></health-state-form>
      <health-regen-settings-form
        .health=${physicalHealth}
        .regenUpdater=${updater.prop('data', 'physicalHealth').nestedStore()}
      ></health-regen-settings-form>
    `;
  }

  private renderMeshHealthEdit() {
    const { nonDefaultBrain } = this.sleeve;

    // TODO figure out better types so I don't have to do this nonsense
    if (nonDefaultBrain) {
      const { updater, meshHealth } = nonDefaultBrain;
      return html`
        <h3>${nonDefaultBrain.name} ${localize('meshHealth')}</h3>
        ${renderUpdaterForm(updater.prop('data', 'meshHealth'), {
          fields: ({ baseDurability }) =>
            renderNumberField(baseDurability, { min: 1 }),
        })}
        <health-state-form .health=${meshHealth}></health-state-form>
        <health-regen-settings-form
          .health=${meshHealth}
          .regenUpdater=${updater.prop('data', 'meshHealth').nestedStore()}
        ></health-regen-settings-form>
      `;
    }
    const { updater, meshHealth } = this.sleeve;
    return html`
      <h3>${localize('meshHealth')}</h3>
      ${renderUpdaterForm(updater.prop('data', 'meshHealth'), {
        fields: ({ baseDurability }) =>
          renderNumberField(baseDurability, { min: 1 }),
      })}
      <health-state-form .health=${meshHealth}></health-state-form>
      <health-regen-settings-form
        .health=${meshHealth}
        .regenUpdater=${updater.prop('data', 'meshHealth').nestedStore()}
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
        ${renderUpdaterForm(updater.prop('data', 'firewallHealth'), {
          fields: ({ baseDurability }) =>
            renderNumberField(baseDurability, { min: 1 }),
        })}
        <health-state-form .health=${firewallHealth}></health-state-form>
      `;
    }
    const { updater, firewallHealth } = this.sleeve;
    return html`
      <h3>${localize('firewallHealth')}</h3>
      ${renderUpdaterForm(updater.prop('data', 'firewallHealth'), {
        fields: ({ baseDurability }) =>
          renderNumberField(baseDurability, { min: 1 }),
      })}
      <health-state-form .health=${firewallHealth}></health-state-form>
    `;
  }

  private renderPoolEdit() {
    return html`
      <h3>${localize('pools')}</h3>
      ${renderPoolEditForm(this.sleeve.updater.prop('data', 'pools'))}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'synthetic-form': SyntheticForm;
  }
}
