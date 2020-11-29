import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
  renderSlider,
  renderTextareaField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import { openWindow } from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import {
  AttackTrait,
  enumValues,
  FirearmAmmoModifierType,
  KineticWeaponClass,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import type { FirearmAmmo } from '@src/entities/item/proxies/firearm-ammo';
import { pairList } from '@src/features/check-list';
import {
  addFeature,
  addUpdateRemoveFeature,
  idProp,
  matchID,
} from '@src/features/feature-helpers';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import {
  customElement,
  html,
  internalProperty,
  property,
  PropertyValues,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { map, mapToObj, pipe, range, take } from 'remeda';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { renderFirearmAmmoDetails } from '../firearm-ammo-details';
import { ItemFormBase } from '../item-form-base';
import styles from './firearm-ammo-form.scss';

@customElement('firearm-ammo-form')
export class FirearmAmmoForm extends ItemFormBase {
  static get is() {
    return 'firearm-ammo-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: FirearmAmmo;

  @internalProperty() private editingModeId!: string;

  private payloadSheet?: SlWindow | null;

  private readonly payloadSheetKey = {};

  private readonly modeOps = addUpdateRemoveFeature(
    () => this.item.updater.prop('data', 'modes').commit,
  );

  update(changedProps: PropertyValues) {
    const { modes } = this.item;
    const mode = modes.find(matchID(this.editingModeId));
    if (!mode) this.editingModeId = this.item.defaultMode.id;
    if (this.payloadSheet) this.openPayloadSheet();

    super.update(changedProps);
  }

  disconnectedCallback() {
    this.closePayloadSheet();
    super.disconnectedCallback();
  }

  private addDrop = handleDrop(async ({ ev, data }) => {
    if (this.disabled) return;
    if (data?.type === DropType.Item) {
      const agent = await itemDropToItemProxy(data);
      if (agent?.type === ItemType.Substance) {
        if (agent.isElectronic) {
          // TODO Better error messages
          notify(
            NotificationType.Error,
            `${localize('non-electronic')} ${localize('substance')}`,
          );
        } else {
          this.item.setPayload(agent);
        }
      }
    }
  });

  private openPayloadSheet() {
    const { payload, fullName } = this.item;
    if (!payload) return this.closePayloadSheet();
    const { win, wasConnected } = openWindow(
      {
        key: this.payloadSheetKey,
        content: renderItemForm(payload),
        adjacentEl: this,
        forceFocus: !this.payloadSheet,
        name: `[${fullName} ${localize('coating')}] ${payload.fullName}`,
      },
      { resizable: ResizeOption.Vertical },
    );

    this.payloadSheet = win;
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => (this.payloadSheet = null),
        { once: true },
      );
    }
  }

  private closePayloadSheet() {
    this.payloadSheet?.close();
    this.payloadSheet = null;
  }

  private updateProgrammedTypeCount(length: number) {
    const { modes, updater } = this.item;
    pipe(
      modes,
      modes.length > length
        ? take(length)
        : (modes) =>
            range(0, length).reduce(
              (accum, index) =>
                accum[index]
                  ? accum
                  : addFeature(accum, {
                      name: '',
                      attackTraits: [],
                      armorPiercing: false,
                      steady: false,
                      damageFormula: '',
                      damageModifierType: FirearmAmmoModifierType.Formula,
                      notes: '',
                    }),
              modes,
            ),
      updater.prop('data', 'modes').commit,
    );
  }

  render() {
    const {
      updater,
      type,
      canCarryPayload,
      payload,
      loaded,
      modes,
    } = this.item;
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
            <sl-header heading=${localize('details')}>
              ${renderAutoForm({
                slot: 'action',
                disabled,
                props: { count: modes.length },
                update: ({ count = 1 }) =>
                  this.updateProgrammedTypeCount(count),
                fields: ({ count }) =>
                  html`
                    <span class="modes-wrapper">
                      ${localize('programmableModes')}
                      ${renderSlider(count, {
                        min: 1,
                        max: 3,
                        step: 1,
                        markers: true,
                        pin: true,
                        disabled: loaded,
                      })}
                    </span>
                  `,
              })}
            </sl-header>
            <div class="detail-forms">
              ${renderUpdaterForm(updater.prop('data'), {
                disabled,
                classes: 'settings-form',
                fields: ({ ammoClass, carryPayload }) => [
                  renderSelectField(ammoClass, enumValues(KineticWeaponClass), {
                    disabled: loaded,
                  }),
                  renderLabeledCheckbox(carryPayload),
                ],
              })}
              ${renderUpdaterForm(updater.prop('data'), {
                classes: complexityForm.cssClass,
                disabled,
                fields: renderComplexityFields,
              })}
              ${renderUpdaterForm(updater.prop('data'), {
                disabled,
                classes: 'quantity-form',
                fields: ({ quantity, roundsPerComplexity }) => [
                  loaded
                    ? html`<div></div>`
                    : renderNumberField(
                        { ...quantity, label: localize('rounds') },
                        { min: 0 },
                      ),
                  renderNumberField(roundsPerComplexity, { min: 1 }),
                ],
              })}
            </div>
          </section>
        </div>

        <sl-animated-list slot="details" transformOrigin="top">
          ${repeat(modes, idProp, this.renderMode)}
          ${canCarryPayload
            ? html`
                <sl-dropzone ?disabled=${disabled} @drop=${this.addDrop}>
                  <sl-header
                    heading=${localize('payload')}
                    ?hideBorder=${!payload}
                    ><mwc-icon
                      slot="info"
                      data-tooltip="${localize('drop')} ${localize(
                        'non-electronic',
                      )} ${localize('substance')}"
                      @mouseenter=${tooltip.fromData}
                      >info</mwc-icon
                    ></sl-header
                  >
                  ${payload
                    ? html`
                        <div class="addon">
                          <span class="addon-name">${payload.name}</span>
                          <span class="addon-type">${payload.fullType}</span>
                          <mwc-icon-button
                            icon="launch"
                            @click=${this.openPayloadSheet}
                          ></mwc-icon-button>
                          <delete-button
                            ?disabled=${disabled}
                            @delete=${payload.deleteSelf}
                          ></delete-button>
                        </div>
                      `
                    : ''}
                </sl-dropzone>
              `
            : ''}
        </sl-animated-list>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.prop('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private renderMode = (mode: FirearmAmmo['modes'][number]) => {
    return html`
      <section>
        <sl-header
          heading=${this.item.hasMultipleModes ? mode.name : localize('attack')}
        >
          <mwc-icon-button
            slot="action"
            icon="edit"
            ?disabled=${this.disabled}
            @click=${() => {
              this.editingModeId = mode.id;
              this.setDrawer(this.renderAmmoEdit);
            }}
          ></mwc-icon-button>
        </sl-header>
        <div class="attack-details">${renderFirearmAmmoDetails(mode)}</div>
      </section>
    `;
  };

  private renderAmmoEdit() {
    const { hasMultipleModes, modes } = this.item;
    const modeMap = mapToObj(modes, (mode) => [mode.id, mode.name]);
    const activeMode = modes.find(matchID(this.editingModeId))!;
    const [pairedTraits, change] = pairList(
      activeMode.attackTraits,
      enumValues(AttackTrait),
    );

    return html`
      <h3>${localize('edit')} ${localize('ammo')}</h3>
      ${hasMultipleModes
        ? renderAutoForm({
            classes: 'mode-select-form',
            props: { mode: this.editingModeId },
            update: ({ mode }) => {
              if (mode) this.editingModeId = mode;
            },
            fields: ({ mode }) =>
              renderSelectField(
                { ...mode, label: `${localize('edit')} ${mode.label}` },
                Object.keys(modeMap),
                { altLabel: (id) => modeMap[id] || id },
              ),
          })
        : ''}
      ${renderAutoForm({
        classes: 'ammo-settings',
        props: activeMode,
        update: this.modeOps.update,
        fields: ({
          name,
          damageModifierType,
          damageFormula,
          steady,
          armorPiercing,
        }) => [
          hasMultipleModes
            ? renderTextField(name, {
                placeholder: String(
                  this.item.modes.findIndex(matchID(activeMode.id)) + 1,
                ),
              })
            : '',
          renderSelectField(
            {
              ...damageModifierType,
              label: `${localize('modifier')} ${localize('type')}`,
            },
            enumValues(FirearmAmmoModifierType),
          ),
          damageModifierType.value === FirearmAmmoModifierType.Formula
            ? renderFormulaField(damageFormula)
            : '',
          damageModifierType.value !== FirearmAmmoModifierType.NoDamage
            ? renderLabeledCheckbox(armorPiercing)
            : '',
          renderLabeledCheckbox(steady),
        ],
      })}
      <p class="label">${localize('attackTraits')}</p>

      ${renderAutoForm({
        props: pairedTraits,
        update: (traits) =>
          this.modeOps.update(
            { attackTraits: change(traits) },
            { id: activeMode.id },
          ),
        fields: (traits) => map(Object.values(traits), renderLabeledCheckbox),
      })}
      ${renderAutoForm({
        props: activeMode,
        update: this.modeOps.update,
        fields: ({ notes }) => renderTextareaField(notes),
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'firearm-ammo-form': FirearmAmmoForm;
  }
}
