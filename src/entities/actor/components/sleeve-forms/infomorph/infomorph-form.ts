import { renderNumberField } from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import type { Infomorph } from '@src/entities/actor/proxies/infomorph';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { renderPoolEditForm } from '../pools/pool-edit-form';
import { SleeveFormBase } from '../sleeve-form-base';
import styles from './infomorph-form.scss';

@customElement('infomorph-form')
export class InfomorphForm extends SleeveFormBase {
  static get is() {
    return 'infomorph-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) sleeve!: Infomorph;

  private handleItemDrop = handleDrop(async ({ data }) => {
    if (data?.type === DropType.Item) {
      this.sleeve.addNewItemProxy(await itemDropToItemProxy(data));
    } else
      notify(
        NotificationType.Info,
        localize('DESCRIPTIONS', 'OnlyInfomorphItems'),
      );
  });

  render() {
    const {
      updater,
      disabled,
      itemGroups,
      pools,
      meshHealth,
      type,
      sleeved,
      itemTrash,
    } = this.sleeve;

    return html`
      <entity-form-layout noSidebar>
        <entity-form-header
          slot="header"
          .updateActions=${updater.prop('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
          ${sleeved ? html` <li slot="tag">${localize('sleeved')}</li> ` : ''}
        </entity-form-header>
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
            <sl-header heading=${localize('meshHealth')}>
              <mwc-icon-button
                slot="action"
                data-tooltip=${localize('changes')}
                @mouseover=${tooltip.fromData}
                @focus=${tooltip.fromData}
                icon="change_history"
                @click=${this.setDrawerFromEvent(
                  this.renderHealthChangeHistory,
                  false,
                )}
              ></mwc-icon-button>
            </sl-header>
            <health-item
              clickable
              ?disabled=${disabled}
              .health=${meshHealth}
              @click=${this.setDrawerFromEvent(this.renderMeshHealthEdit)}
            ></health-item>
          </section>

          <sl-dropzone @drop=${this.handleItemDrop} ?disabled=${disabled}>
            <sl-header
              heading="${localize('traits')} & ${localize('software')}"
            >
              <mwc-icon
                slot="info"
                data-tooltip=${localize('DESCRIPTIONS', 'OnlyInfomorphItems')}
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

            ${notEmpty(itemGroups.ware)
              ? html`
                  <form-items-list
                    .items=${itemGroups.ware}
                    label=${localize('software')}
                  ></form-items-list>
                `
              : ''}
            ${notEmpty(itemGroups.traits)
              ? html`
                  <form-items-list
                    .items=${itemGroups.traits}
                    label=${localize('traits')}
                  ></form-items-list>
                `
              : ''}
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

  private renderItemTrash() {
    return html`
      <h3>${localize('deleted')} ${localize('items')}</h3>
      <item-trash .proxy=${this.sleeve}></item-trash>
    `;
  }

  private renderHealthChangeHistory() {
    const { meshHealth, disabled } = this.sleeve;
    return html`
      <section class="history">
        <h3>${localize('history')}</h3>
        <health-log .health=${meshHealth} ?disabled=${disabled}></health-log>
      </section>
    `;
  }

  private renderMeshHealthEdit() {
    const { meshHealth, updater } = this.sleeve;
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

  private renderPoolEdit() {
    return html`
      <h3>${localize('pools')}</h3>
      ${renderPoolEditForm(this.sleeve.updater.prop('data', 'pools'))}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'infomorph-form': InfomorphForm;
  }
}
