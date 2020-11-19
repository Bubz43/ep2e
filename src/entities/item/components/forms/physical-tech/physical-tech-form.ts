import {
  emptyTextDash,
  renderNumberField,
  renderRadioFields,
  renderSelectField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import { openWindow } from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import {
  AptitudeType,
  DeviceType,
  EffectStates,
  enumValues,
  FabType,
  PhysicalWare,
} from '@src/data-enums';
import { renderEgoForm } from '@src/entities/actor/actor-views';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { renderItemForm } from '@src/entities/item/item-views';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { ActionType } from '@src/features/actions';
import type { EffectCreatedEvent } from '@src/features/components/effect-creator/effect-created-event';
import { EffectType } from '@src/features/effects';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { CommonInterval } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  property,
  PropertyValues,
} from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { difference, mapToObj } from 'remeda';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './physical-tech-form.scss';

const opsGroups = ['effects', 'activatedEffects'] as const;

@customElement('physical-tech-form')
export class PhysicalTechForm extends ItemFormBase {
  static get is() {
    return 'physical-tech-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: PhysicalTech;

  @internalProperty() effectGroup: 'passive' | 'activated' = 'passive';

  private egoSheet?: SlWindow | null;

  private egoSheetKey = {};

  private readonly effectsOps = mapToObj(opsGroups, (group) => [
    group === 'effects' ? 'passive' : 'activated',
    addUpdateRemoveFeature(() => this.item.updater.prop('data', group).commit),
  ]);

  update(changedProps: PropertyValues) {
    if (!this.item.hasActivation) this.effectGroup = 'passive';
    if (this.egoSheet) this.openEgoSheet();
    super.update(changedProps);
  }

  private addCreatedEffect(ev: EffectCreatedEvent) {
    this.effectsOps[this.effectGroup].add({}, ev.effect);
  }

  private openEgoSheet() {
    const { onboardALI, fullName } = this.item;
    if (!onboardALI) return this.closeEgoSheet();
    const { win, wasConnected } = openWindow(
      {
        key: this.egoSheetKey,
        content: renderEgoForm(onboardALI),
        adjacentEl: this,
        forceFocus: !this.egoSheet,
        name: `[${fullName} ${localize('onboardALI')}] ${onboardALI.name}`,
      },
      { resizable: ResizeOption.Vertical },
    );

    this.egoSheet = win;
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => (this.egoSheet = null),
        { once: true },
      );
    }
  }

  private closeEgoSheet() {
    this.egoSheet?.close();
    this.egoSheet = null;
  }

  render() {
    const {
      updater,
      embedded,
      isBlueprint,
      type,
      deviceType,
      effectGroups,
      hasActivation,
      hasUse,
      hasMeshHealth,
    } = this.item;
    const { disabled } = this;
    // TODO Fabrication
    return html`
      <entity-form-layout>
        <entity-form-header
          noDefaultImg
          slot="header"
          .updateActions=${updater.prop('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
          ${isBlueprint
            ? html` <li slot="tag">${localize('blueprint')}</li> `
            : ''}
        </entity-form-header>

        ${renderUpdaterForm(updater.prop('data'), {
          disabled,
          slot: 'sidebar',
          fields: ({
            category,
            effectStates,
            wareType,
            deviceType,
            fabricator,
            activationAction,
            firewallRating,
          }) => [
            renderSelectField(wareType, enumValues(PhysicalWare), {
              ...emptyTextDash,
              disabled: !!embedded,
            }),
            renderTextField(category),
            html`<entity-form-sidebar-divider></entity-form-sidebar-divider>`,
            renderSelectField(effectStates, enumValues(EffectStates), {
              disableOptions: notEmpty(this.item.epData.activatedEffects)
                ? [EffectStates.Passive]
                : undefined,
            }),
            hasActivation
              ? renderSelectField(
                  activationAction,
                  difference(enumValues(ActionType), [ActionType.Task]),
                )
              : '',
            html`<entity-form-sidebar-divider></entity-form-sidebar-divider>`,
            renderSelectField(deviceType, enumValues(DeviceType), {
              ...emptyTextDash,
              disabled: !!embedded,
            }),
            hasMeshHealth
              ? renderNumberField(firewallRating, { min: 1, max: 99 })
              : '',
            renderSelectField(fabricator, enumValues(FabType), emptyTextDash),
          ],
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.prop('data'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}
          ${deviceType ? this.renderMeshHealthSection() : ''}

          <section>
            <sl-header heading=${localize('onboardALI')}>
            <mwc-icon-button slot="action" icon="launch" @click=${this.openEgoSheet}></mwc-icon-button>
          </sl-header>
            <sl-group label=${localize('skills')}
              >${this.item.onboardALI.skills.map(
                (skill, index, list) => html`
                  <span ?data-comma=${index < list.length - 1}>${skill.fullName} ${skill.total}</span>
                `,
              )}</sl-group
            >
          </section>

          <section>
            <sl-header
              heading=${localize('effects')}
              ?hideBorder=${effectGroups.size === 0 && !hasUse}
              ><mwc-icon-button
                icon="add"
                slot="action"
                @click=${this.setDrawerFromEvent(this.renderEffectCreator)}
                ?disabled=${disabled}
              ></mwc-icon-button
            ></sl-header>
            ${hasUse
              ? renderUpdaterForm(updater.prop('data'), {
                  disabled,
                  classes: 'activation-form',
                  fields: ({ usedEffectsDuration, resistEffectsCheck }) => [
                    renderSelectField(
                      resistEffectsCheck,
                      enumValues(AptitudeType),
                      { emptyText: localize('none') },
                    ),
                    renderTimeField(usedEffectsDuration, {
                      permanentLabel: localize('indefinite'),
                      min: CommonInterval.Turn,
                    }),
                  ],
                })
              : ''}
            ${[...effectGroups].map(([key, group]) =>
              notEmpty(group)
                ? html`
                    <item-form-effects-list
                      label=${ifDefined(
                        hasActivation ? localize(key) : undefined,
                      )}
                      .effects=${group}
                      .operations=${this.effectsOps[key]}
                      ?disabled=${disabled}
                    ></item-form-effects-list>
                  `
                : '',
            )}
          </section>
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

  private renderMeshHealthSection() {
    return html`
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
          ?disabled=${this.disabled}
          .health=${this.item.meshHealth}
          @click=${this.setDrawerFromEvent(this.renderMeshHealthEdit)}
        ></health-item>
        <health-item
          clickable
          ?disabled=${this.disabled}
          .health=${this.item.firewallHealth}
          @click=${this.setDrawerFromEvent(this.renderFirewallHealthEdit)}
        ></health-item>
      </section>
    `;
  }

  private renderHealthChangeHistory() {
    const { meshHealth, firewallHealth } = this.item;
    return html`
      <section class="history">
        <h3>${localize('history')}</h3>
        <h4>${localize('meshHealth')}</h4>
        <health-log
          .health=${meshHealth}
          ?disabled=${this.disabled}
        ></health-log>
        <h4>${localize('firewallHealth')}</h4>
        <health-log
          .health=${firewallHealth}
          ?disabled=${this.disabled}
        ></health-log>
      </section>
    `;
  }

  private renderMeshHealthEdit() {
    const { meshHealth, updater } = this.item;
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
    const { firewallHealth, updater } = this.item;
    return html`
      <h3>${localize('firewallHealth')}</h3>
      ${renderUpdaterForm(updater.prop('data', 'firewallHealth'), {
        fields: ({ baseDurability }) =>
          renderNumberField(baseDurability, { min: 1 }),
      })}
      <health-state-form .health=${firewallHealth}></health-state-form>
    `;
  }

  private renderEffectCreator() {
    return html`
      <h3>${localize('add')} ${localize('effect')}</h3>
      ${this.item.hasActivation
        ? renderAutoForm({
            props: { group: this.effectGroup },
            classes: 'effect-group-form',
            update: ({ group }) => group && (this.effectGroup = group),
            fields: ({ group }) =>
              renderRadioFields(group, ['passive', 'activated']),
          })
        : ''}

      <effect-creator
        .effectTypes=${enumValues(EffectType)}
        @effect-created=${this.addCreatedEffect}
      ></effect-creator>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'physical-tech-form': PhysicalTechForm;
  }
}
