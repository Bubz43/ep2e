import {
  formatArmorUsed,
  formatLabeledFormulas,
} from '@src/combat/attack-formatting';
import type { DropZone } from '@src/components/dropzone/dropzone';
import {
  emptyTextDash,
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderNumberInput,
  renderSelectField,
  renderTextareaField,
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
  PhysicalWare,
  SprayPayload,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import { SprayWeapon } from '@src/entities/item/proxies/spray-weapon';
import type { Substance } from '@src/entities/item/proxies/substance';
import { ArmorType } from '@src/features/active-armor';
import { pairList } from '@src/features/check-list';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property, PropertyValues } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { createPipe, identity, map, objOf } from 'remeda';
import {
  accessoriesListStyles,
  complexityForm,
  renderComplexityFields,
  renderFiringModeCheckboxes,
  renderGearTraitCheckboxes,
  renderRangedAccessoriesEdit,
} from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './spray-weapon-form.scss';

@customElement('spray-weapon-form')
export class SprayWeaponForm extends ItemFormBase {
  static get is() {
    return 'spray-weapon-form' as const;
  }

  static styles = [
    entityFormCommonStyles,
    complexityForm.styles,
    accessoriesListStyles,
    styles,
  ];

  private payloadSheet?: SlWindow | null;

  private readonly payloadSheetKey = {};

  @property({ attribute: false }) item!: SprayWeapon;

  update(changedProps: PropertyValues<this>) {
    if (this.payloadSheet) this.openPayloadSheet();

    super.update(changedProps);
  }

  disconnectedCallback() {
    this.closePayloadSheet();
    super.disconnectedCallback();
  }

  private addDrop = handleDrop(async ({ ev, data }) => {
    if (this.disabled || (ev.currentTarget as DropZone).disabled) return;
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

  render() {
    const {
      updater,
      type,
      accessories,
      payloadUse,
      payload,
      firePayload,
      ammoState,
    } = this.item;
    const { disabled } = this;
    // TODO Some indication that payload has been expended
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

        ${renderUpdaterForm(updater.path('data'), {
          disabled,
          slot: 'sidebar',
          fields: ({ wareType, range, fixed, long, payloadUse, ...traits }) => [
            renderSelectField(
              wareType,
              enumValues(PhysicalWare),
              emptyTextDash,
            ),
            renderNumberField(
              { ...range, label: `${range.label} (${localize('meters')})` },
              { min: 1 },
            ),
            renderSelectField(
              payloadUse,
              enumValues(SprayPayload),
              payload ? undefined : emptyTextDash,
            ),
            html`<entity-form-sidebar-divider
              label="${localize('weapon')} ${localize('traits')}"
            ></entity-form-sidebar-divider>`,
            renderLabeledCheckbox(fixed),
            renderLabeledCheckbox(long),
            html`<entity-form-sidebar-divider
              label=${localize('gearTraits')}
            ></entity-form-sidebar-divider>`,
            renderGearTraitCheckboxes(traits),
          ],
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.path('data'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}
          ${this.renderAttack()}

          <sl-dropzone ?disabled=${!firePayload} @drop=${this.addDrop}>
            <sl-header heading=${localize('ammo')}
              >${firePayload
                ? renderUpdaterForm(updater.path('data'), {
                    disabled,
                    classes: 'doses-form',
                    slot: 'action',
                    fields: ({ dosesPerShot }) => html`
                      <mwc-formfield alignEnd label=${dosesPerShot.label}
                        >${renderNumberInput(dosesPerShot, {
                          min: 1,
                        })}</mwc-formfield
                      >
                    `,
                  })
                : ''}</sl-header
            >
            ${firePayload && payload
              ? html`
                  ${this.renderPayload(payload)}
                  <hr />
                `
              : ''}
            ${renderAutoForm({
              props: {
                max: ammoState.max,
                value: firePayload ? payload?.quantity || 0 : ammoState.value,
              },
              update: ({ value, max }) => {
                if (max !== undefined)
                  this.item.updater.path('data', 'ammo', 'max').commit(max);
                else if (value !== undefined) this.item.updateAmmoValue(value);
              },
              disabled,
              classes: 'ammo-form',
              fields: ({ value, max }) => [
                renderNumberField(
                  { ...max, label: localize('capacity') },
                  { min: 1 },
                ),
                renderNumberField(value, {
                  min: 0,
                  max: max.value,
                  disabled: firePayload && !payload,
                }),
              ],
            })}
          </sl-dropzone>

          ${payloadUse === SprayPayload.CoatAmmunition
            ? html`
                <sl-dropzone ?disabled=${disabled} @drop=${this.addDrop}>
                  <sl-header
                    heading="${localize('ammo')} ${localize('coating')}"
                    ?hideBorder=${!payload}
                    ><mwc-icon
                      slot="info"
                      data-tooltip="${localize('drop')} ${localize(
                        'non-electronic',
                      )} ${localize('substance')}"
                      @mouseenter=${tooltip.fromData}
                      >info</mwc-icon
                    >
                    ${payload
                      ? renderUpdaterForm(payload.updater.path('data'), {
                          disabled,
                          classes: 'payload-quantity-form',
                          slot: 'action',
                          fields: ({ quantity }) => html`
                            <mwc-formfield alignEnd label=${quantity.label}
                              >${renderNumberInput(quantity, {
                                min: 0,
                              })}</mwc-formfield
                            >
                          `,
                        })
                      : ''}
                  </sl-header>
                  ${payload ? this.renderPayload(payload) : ''}
                </sl-dropzone>
              `
            : ''}

          <section>
            <sl-header heading=${localize('accessories')}>
              <mwc-icon-button
                slot="action"
                icon="edit"
                ?disabled=${disabled}
                @click=${this.setDrawerFromEvent(this.renderAccessoriesEdit)}
              ></mwc-icon-button>
            </sl-header>

            <sl-animated-list class="accessories-list">
              ${repeat(
                accessories,
                identity,
                (accessory) => html` <li>${localize(accessory)}</li> `,
              )}
            </sl-animated-list>
          </section>
        </div>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.path('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private renderPayload(payload: Substance) {
    return html`<div class="addon">
      <span class="addon-name">${payload.name}</span>
      <span class="addon-type">${payload.fullType}</span>
      <mwc-icon-button
        icon="launch"
        @click=${this.openPayloadSheet}
      ></mwc-icon-button>
      <delete-button
        ?disabled=${this.disabled}
        @delete=${payload.deleteSelf}
      ></delete-button>
    </div>`;
  }

  private renderAttack() {
    const { primary: attack } = this.item.attacks;
    return html`
      <section>
        <sl-header heading=${attack.label || localize('attack')}>
          <mwc-icon-button
            icon="edit"
            slot="action"
            ?disabled=${this.disabled}
            @click=${this.setDrawerFromEvent(this.renderAttackEdit)}
          ></mwc-icon-button>
        </sl-header>

        <div class="attack-details">
          <sl-group label=${localize('SHORT', 'damageValue')}>
            ${notEmpty(attack.rollFormulas)
              ? [
                  formatLabeledFormulas(attack.rollFormulas),
                  formatArmorUsed(attack),
                ].join('; ')
              : '-'}
          </sl-group>

          ${notEmpty(attack.attackTraits)
            ? html`
                <sl-group class="attack-traits" label=${localize('traits')}>
                  ${map(attack.attackTraits, localize).join(', ')}</sl-group
                >
              `
            : ''}

          <sl-group label=${localize('firingModes')} class="firing-modes"
            >${attack.firingModes
              .map((mode) => localize('SHORT', mode))
              .join('/')}</sl-group
          >
          ${attack.superiorSuccessDot
            ? html`
                <sl-group
                  label="${localize('on')} ${localize('superiorSuccess')}"
                >
                  ${format('DotPerTurnNoArmor', {
                    formula: attack.superiorSuccessDot,
                  })}
                </sl-group>
              `
            : ''}
          ${attack.notes
            ? html`
                <sl-group class="attack-notes" label=${localize('notes')}>
                  ${attack.notes}</sl-group
                >
              `
            : ''}
        </div>
      </section>
    `;
  }

  private renderAttackEdit() {
    const updater = this.item.updater.path('data', 'primaryAttack');
    const [pairedTraits, changeTraits] = pairList(
      updater.originalValue().attackTraits,
      enumValues(AttackTrait),
    );
    return html`
      <h3>${localize('attack')}</h3>

      ${renderUpdaterForm(updater, {
        classes: 'attack-edit',
        fields: ({
          damageFormula,
          armorPiercing,
          superiorSuccessDot,
          armorUsed,
        }) => [
          renderFormulaField(damageFormula),
          renderSelectField(armorUsed, [ArmorType.Energy, ArmorType.Kinetic], {
            emptyText: '-',
          }),
          armorUsed.value ? renderLabeledCheckbox(armorPiercing) : '',
          renderFormulaField(superiorSuccessDot),
        ],
      })}

      <p class="label">${localize('firingModes')}</p>
      ${renderFiringModeCheckboxes(updater)}

      <p class="label">${localize('attackTraits')}</p>
      ${renderAutoForm({
        props: pairedTraits,
        update: createPipe(changeTraits, objOf('attackTraits'), updater.commit),
        fields: (traits) => map(Object.values(traits), renderLabeledCheckbox),
      })}
      ${renderUpdaterForm(updater, {
        fields: ({ notes }) => renderTextareaField(notes),
      })}
    `;
  }

  private renderAccessoriesEdit() {
    return renderRangedAccessoriesEdit(
      this.item.accessories,
      SprayWeapon.possibleAccessories,
      this.item.updater.path('data', 'accessories').commit,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'spray-weapon-form': SprayWeaponForm;
  }
}
