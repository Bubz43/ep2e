import {
  emptyTextDash,
  renderLabeledCheckbox,
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
  Activation,
  AptitudeType,
  DeviceType,
  enumValues,
  FabType,
  PhysicalWare,
} from '@src/data-enums';
import { renderEgoForm } from '@src/entities/components/render-ego-form';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
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
import { renderItemForm } from '@src/entities/item/item-views';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { ItemType } from '@src/entities/entity-types';
import { NotificationType, notify } from '@src/foundry/foundry-apps';

const opsGroups = ['passiveEffects', 'activatedEffects'] as const;

@customElement('physical-tech-form')
export class PhysicalTechForm extends ItemFormBase {
  static get is() {
    return 'physical-tech-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: PhysicalTech;

  @internalProperty() effectGroup: 'passive' | 'activated' = 'passive';

  private glandSheet?: SlWindow | null;

  private blueprintSheet?: SlWindow | null;

  private glandSheetKey = {};

  private blueprintSheetKey = {};

  private readonly effectsOps = mapToObj(opsGroups, (group) => [
    group,
    addUpdateRemoveFeature(() => this.item.updater.prop('data', group).commit),
  ]);

  disconnectedCallback() {
    this.closeGlandSheet();
    this.closeBlueprintSheet();
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues) {
    if (!this.item.hasActivation) this.effectGroup = 'passive';
    if (this.blueprintSheet) this.openBlueprintSheet();
    if (this.glandSheet) this.openGlandSheet();
    super.update(changedProps);
  }

  private addDrop = handleDrop(async ({ ev, data }) => {
    if (this.disabled || data?.type !== DropType.Item) return;
    const blueprintDrop =
      (ev.currentTarget as HTMLElement).dataset.drop === 'blueprint';
    const proxy = await itemDropToItemProxy(data);
    if (blueprintDrop) {
      if (proxy && 'isBlueprint' in proxy && proxy.isBlueprint) {
        this.item.addItemBlueprint(proxy);
      } else notify(NotificationType.Error, localize('itemMustBeBlueprint'));
    } else {
      if (proxy?.type !== ItemType.Substance || proxy.isElectronic) {
        notify(
          NotificationType.Error,
          localize('DESCRIPTIONS', 'NonElectronicSubstanceOnly'),
        );
      } else this.item.addSubstanceToGland(proxy);
    }
  });

  private openGlandSheet() {
    const { glandedSubstance, fullName } = this.item;
    if (!glandedSubstance) return this.closeGlandSheet();

    const { win, wasConnected } = openWindow(
      {
        key: this.glandSheetKey,
        content: renderItemForm(glandedSubstance),
        adjacentEl: this,
        forceFocus: !this.glandSheet,
        name: `[${fullName} ${localize('gland')}] ${glandedSubstance.fullName}`,
      },
      { resizable: ResizeOption.Vertical },
    );

    this.glandSheet = win;
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => (this.glandSheet = null),
        { once: true },
      );
    }
  }

  private closeGlandSheet() {
    this.glandSheet?.close();
    this.glandSheet = null;
  }

  private openBlueprintSheet() {
    const { itemBlueprint, fullName } = this.item;
    if (!itemBlueprint) return this.closeBlueprintSheet();

    const { win, wasConnected } = openWindow(
      {
        key: this.blueprintSheetKey,
        content: renderItemForm(itemBlueprint),
        adjacentEl: this,
        forceFocus: !this.blueprintSheet,
        name: `[${fullName} ${localize('fab')}] ${itemBlueprint.fullName}`,
      },
      { resizable: ResizeOption.Vertical },
    );

    this.blueprintSheet = win;
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => (this.blueprintSheet = null),
        { once: true },
      );
    }
  }

  private closeBlueprintSheet() {
    this.blueprintSheet?.close();
    this.blueprintSheet = null;
  }

  private addCreatedEffect(ev: EffectCreatedEvent) {
    this.effectsOps[`${this.effectGroup}Effects` as const].add({}, ev.effect);
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
      hasUseActivation,
      hasMeshHealth,
      onboardALI,
      hasOnboardALI,
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
          ${isBlueprint
            ? html` <li slot="tag">${localize('blueprint')}</li> `
            : ''}
        </entity-form-header>

        ${renderUpdaterForm(updater.prop('data'), {
          disabled,
          slot: 'sidebar',
          fields: ({
            category,
            wareType,
            deviceType,
            fabricator,
            activation,
            activationAction,
            firewallRating,
            onboardALI,
          }) => [
            renderSelectField(wareType, enumValues(PhysicalWare), {
              ...emptyTextDash,
              disabled: !!embedded,
            }),
            renderTextField(category),
            html`<entity-form-sidebar-divider></entity-form-sidebar-divider>`,
            renderSelectField(activation, enumValues(Activation), {
              disableOptions: notEmpty(this.item.epData.activatedEffects)
                ? [Activation.None]
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
              ? [
                  renderNumberField(firewallRating, { min: 1, max: 99 }),
                  renderLabeledCheckbox(onboardALI),
                ]
              : '',
            renderSelectField(fabricator, enumValues(FabType), {
              ...emptyTextDash,
              disabled: this.item.disableFabTypeChange,
            }),
          ],
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.prop('data'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}
          ${deviceType ? this.renderMeshHealthSection() : ''}
          ${hasOnboardALI
            ? html`
                <section>
                  <sl-header heading=${localize('onboardALI')}>
                    <mwc-icon-button
                      slot="action"
                      icon="launch"
                      @click=${this.item.onboardALI.openForm}
                    ></mwc-icon-button>
                  </sl-header>
                  ${onboardALI.trackMentalHealth
                    ? html`
                        <health-item .health=${onboardALI.mentalHealth}
                          ><span slot="source"
                            >${localize('mentalHealth')}</span
                          ></health-item
                        >
                      `
                    : ''}
                  <sl-group label=${localize('skills')} class="skills"
                    ><ul class="ali-skills">
                      ${onboardALI.skills.map(
                        (skill, index, list) => html`
                          <li
                            class="ali-skill"
                            ?data-comma=${index < list.length - 1}
                          >
                            <span class="skill-info"
                              >${skill.fullName} ${skill.total}</span
                            >
                          </li>
                        `,
                      )}
                    </ul></sl-group
                  >
                </section>
              `
            : ''}
          ${this.item.fabricatorType
            ? this.renderFabSection(this.item.fabricatorType)
            : ''}

          <section
            class=${effectGroups.size === 0 && !hasUseActivation ? 'mini' : ''}
          >
            <sl-header
              heading=${localize('effects')}
              ?hideBorder=${effectGroups.size === 0 && !hasUseActivation}
            >
              ${this.item.hasToggleActivation
                ? html`
                    <mwc-icon
                      slot="info"
                      data-tooltip=${localize('PassiveEffectsWhenActivated')}
                      @mouseover=${tooltip.fromData}
                      >info</mwc-icon
                    >
                  `
                : ''}
              <mwc-icon-button
                icon="add"
                slot="action"
                @click=${this.setDrawerFromEvent(this.renderEffectCreator)}
                ?disabled=${disabled}
              ></mwc-icon-button
            ></sl-header>
            ${hasUseActivation
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
                      .operations=${this.effectsOps[`${key}Effects` as const]}
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

  private renderFabSection(fabType: FabType) {
    if (fabType === FabType.Gland) {
      const { glandedSubstance, updater } = this.item;
      return html`
        <sl-dropzone ?disabled=${this.disabled} @drop=${this.addDrop}>
          <sl-header
            heading="${localize('gland')} ${localize('substance')}"
          ></sl-header>

          ${renderUpdaterForm(updater.prop('data'), {
            disabled: this.disabled,
            classes: "fab-duration-form",
            fields: ({ fabPrintDuration }) =>
              renderTimeField(
                {
                  ...fabPrintDuration,
                  value: fabPrintDuration.value || CommonInterval.Hour * 4,
                },
                { min: 0 },
              ),
          })}
          ${glandedSubstance
            ? html`
                <div class="addon">
                  <span class="addon-name">${glandedSubstance.name}</span>
                  <span class="addon-type">${glandedSubstance.fullType}</span>
                  <mwc-icon-button
                    icon="launch"
                    @click=${this.openGlandSheet}
                  ></mwc-icon-button>
                  <delete-button
                    ?disabled=${this.disabled}
                    @delete=${glandedSubstance.deleteSelf}
                  ></delete-button>
                </div>
              `
            : ''}
        </sl-dropzone>
      `;
    }
    const { itemBlueprint, updater } = this.item;

    return html`
      <sl-dropzone
        ?disabled=${this.disabled}
        @drop=${this.addDrop}
        data-drop="blueprint"
      >
        <sl-header
          heading="${localize(fabType)} ${localize('fabber')}"
          ?hideBorder=${!itemBlueprint}
        >

        </sl-header>
        ${itemBlueprint
            ? renderUpdaterForm(updater.prop('data'), {
                disabled: this.disabled,
                classes: "fab-duration-form",
                fields: ({ fabPrintDuration }) =>
                  renderTimeField(fabPrintDuration, {
                    min: CommonInterval.Turn,
                  }),
              })
            : ''}
        ${itemBlueprint
          ? html`
              <div class="addon">
                <span class="addon-name">${itemBlueprint.name}</span>
                <span class="addon-type">${itemBlueprint.fullType}</span>
                <mwc-icon-button
                  icon="launch"
                  @click=${this.openBlueprintSheet}
                ></mwc-icon-button>
                <delete-button
                  ?disabled=${this.disabled}
                  @delete=${itemBlueprint.deleteSelf}
                ></delete-button>
              </div>
            `
          : ''}
      </sl-dropzone>
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
