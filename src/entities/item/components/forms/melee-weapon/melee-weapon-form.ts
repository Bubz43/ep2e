import { formatArmorUsed } from '@src/combat/attack-formatting';
import type { MeleeWeaponAttack } from '@src/combat/attacks';
import {
  renderSelectField,
  renderNumberField,
  renderLabeledCheckbox,
  renderFormulaField,
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
  enumValues,
  PhysicalWare,
  GearTrait,
  WeaponAttackType,
  AttackTrait,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import {
  handleDrop,
  isKnownDrop,
  DropType,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { cleanFormula } from '@src/foundry/rolls';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property, PropertyValues } from 'lit-element';
import { map, mapToObj } from 'remeda';
import {
  complexityForm,
  renderComplexityFields,
  renderGearTraitCheckboxes,
} from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './melee-weapon-form.scss';

@customElement('melee-weapon-form')
export class MeleeWeaponForm extends ItemFormBase {
  static get is() {
    return 'melee-weapon-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: MeleeWeapon;

  private coatingSheet?: SlWindow | null;

  private payloadSheet?: SlWindow | null;

  private coatingSheetKey = {};

  private payloadSheetKey = {};

  disconnectedCallback() {
    this.closeCoatingSheet();
    this.closePayloadSheet();
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues) {
    if (this.coatingSheet) {
      if (this.item.coating) {
        openWindow(
          {
            key: this,
            content: renderItemForm(this.item.coating),
            name: `[${this.item.fullName} ${localize('coating')}] ${
              this.item.coating.fullName
            }`,
          },
          { resizable: ResizeOption.Vertical },
        );
      } else this.closeCoatingSheet();
    }
    if (this.payloadSheet) {
      if (this.item.payload) {
        openWindow(
          {
            key: this,
            content: renderItemForm(this.item.payload),
            name: `[${this.item.fullName} ${localize('payload')}] ${
              this.item.payload.fullName
            }`,
          },
          { resizable: ResizeOption.Vertical },
        );
      } else this.closePayloadSheet();
    }
    super.updated(changedProps);
  }

  private openCoatingSheet() {
    const { coating, fullName } = this.item;
    if (!coating) return;
    const { win, wasConnected } = openWindow(
      {
        key: this.coatingSheetKey,
        content: renderItemForm(coating),
        adjacentEl: this,
        forceFocus: true,
        name: `[${fullName} ${localize('coating')}] ${coating.fullName}`,
      },
      { resizable: ResizeOption.Vertical },
    );
    this.coatingSheet = win;
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => (this.coatingSheet = null),
        { once: true },
      );
    }
  }

  private closeCoatingSheet() {
    this.coatingSheet?.close();
    this.coatingSheet = null;
  }

  private deleteCoating() {
    return this.item.removeCoating();
  }

  private addDrop = handleDrop(async ({ ev, data }) => {
    const type = (ev.currentTarget as HTMLElement).dataset.drop;
    if (data?.type === DropType.Item) {
      const agent = await itemDropToItemProxy(data);
      if (agent?.type === ItemType.Explosive) {
        if (this.item.acceptsPayload && type === "payload") this.item.setPayload(agent);
      } else if (agent?.type === ItemType.Substance) {
        if (agent.isElectronic) {
          // TODO Better error messages
          notify(
            NotificationType.Error,
            `${localize('non-electronic')} ${localize('substance')}`,
          );
        } else {
          this.item.setCoating(agent);
        }
      }
    }
  });

  private openPayloadSheet() {
    const { payload, fullName } = this.item;
    if (!payload) return;
    const { win, wasConnected } = openWindow(
      {
        key: this.payloadSheetKey,
        content: renderItemForm(payload),
        adjacentEl: this,
        forceFocus: true,
        name: `[${fullName} ${localize('payload')}] ${payload.fullName}`,
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

  private deletePayload() {
    return this.item.removePayload();
  }

  render() {
    const {
      updater,
      type,
      attacks,
      acceptsPayload,
      coating,
      payload,
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
            wareType,
            touchOnly,
            reachBonus,
            augmentUnarmed,
            improvised,
            hasSecondaryAttack,
            acceptsPayload,
            ...gearTraits
          }) => [
            renderSelectField(wareType, enumValues(PhysicalWare), {
              emptyText: '-',
            }),
            renderNumberField(reachBonus, { min: 0, max: 30, step: 10 }),
            html`<entity-form-sidebar-divider></entity-form-sidebar-divider>`,
            map(
              [
                touchOnly,
                augmentUnarmed,
                improvised,
                { ...hasSecondaryAttack, label: localize('secondaryAttack') },
                { ...acceptsPayload, label: localize('payload') },
              ],
              renderLabeledCheckbox,
            ),
            html`<entity-form-sidebar-divider
              label=${localize('gearTraits')}
            ></entity-form-sidebar-divider>`,
            renderGearTraitCheckboxes(gearTraits),
          ],
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.prop('data'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}
        </div>

        <sl-animated-list slot="details" class="attacks">
          ${this.renderAttack(attacks.primary, WeaponAttackType.Primary)}
          ${attacks.secondary
            ? this.renderAttack(attacks.secondary, WeaponAttackType.Secondary)
            : ''}
        </sl-animated-list>

        <sl-animated-list slot="details" class="addons">
          <sl-dropzone @drop=${this.addDrop}>
            <sl-header heading=${localize('coating')} ?hideBorder=${!coating}
              ><mwc-icon
                slot="info"
                data-tooltip="${localize('drop')} ${localize(
                  'non-electronic',
                )} ${localize('substance')}"
                @mouseenter=${tooltip.fromData}
                >info</mwc-icon
              ></sl-header
            >
          </sl-dropzone>
          ${acceptsPayload
            ? html`
                <sl-dropzone data-drop="payload" @drop=${this.addDrop}>
                  <sl-header
                    heading=${localize('payload')}
                    ?hideBorder=${!payload}
                    ><mwc-icon
                      slot="info"
                      data-tooltip="${localize('drop')} ${localize(
                        'any',
                      )} ${localize('explosive')}"
                      @mouseenter=${tooltip.fromData}
                      >info</mwc-icon
                    ></sl-header
                  >
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

  private renderAttack(attack: MeleeWeaponAttack, type: WeaponAttackType) {
    return html`
      <section>
        <sl-header heading=${attack.label || localize('attack')}>
          <mwc-icon-button
            icon="edit"
            slot="action"
            ?disabled=${this.disabled}
            @click=${this.setDrawerFromEvent(
              type === WeaponAttackType.Primary
                ? this.renderPrimaryAttackEdit
                : this.renderSecondaryAttackEdit,
            )}
          ></mwc-icon-button>
        </sl-header>
        <div class="attack-details">
          <sl-group label=${localize('SHORT', 'damageValue')}>
            ${this.item.augmentUnarmed
              ? `${localize('unarmed')} ${
                  notEmpty(attack.rollFormulas) ? `+` : ''
                }`
              : ''}
            ${notEmpty(attack.rollFormulas)
              ? [
                  cleanFormula(
                    attack.rollFormulas.map(({ formula }) => formula).join('+'),
                  ),
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

  private renderPrimaryAttackEdit() {
    return this.renderAttackEdit(WeaponAttackType.Primary);
  }

  private renderSecondaryAttackEdit() {
    return this.renderAttackEdit(WeaponAttackType.Secondary);
  }

  private renderAttackEdit(type: WeaponAttackType) {
    const updater = this.item.updater.prop('data', type);
    const { hasSecondaryAttack } = this.item;
    const { disabled } = this;
    const { attackTraits } = updater.originalValue();
    const attackTraitsObj = mapToObj(enumValues(AttackTrait), (trait) => [
      trait,
      attackTraits.includes(trait),
    ]);
    return html`
      <h3>${localize(hasSecondaryAttack ? type : 'attack')}</h3>
      ${renderUpdaterForm(updater, {
        disabled,
        fields: ({ damageFormula, armorPiercing, label }) => [
          hasSecondaryAttack
            ? renderTextField(label, { placeholder: localize(type) })
            : '',
          renderFormulaField(damageFormula),
          renderLabeledCheckbox(armorPiercing),
        ],
      })}
      <p class="label">${localize('attackTraits')}</p>
      ${renderAutoForm({
        props: attackTraitsObj,
        update: (traits) =>
          updater.commit({
            attackTraits: enumValues(AttackTrait).flatMap((trait) => {
              const use = traits[trait] === true || attackTraitsObj[trait];
              return use ? trait : [];
            }),
          }),
        fields: (traits) =>
          enumValues(AttackTrait).map((trait) =>
            renderLabeledCheckbox(traits[trait]),
          ),
      })}
      ${renderUpdaterForm(updater, {
        disabled,
        fields: ({ notes }) => [renderTextareaField(notes)],
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'melee-weapon-form': MeleeWeaponForm;
  }
}
