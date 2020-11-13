import {
  formatArmorUsed,
  formatLabeledFormulas,
} from '@src/combat/attack-formatting';
import type { ExplosiveAttack } from '@src/combat/attacks';
import {
  renderSelectField,
  renderLabeledCheckbox,
  renderNumberField,
  renderFormulaField,
  renderTextareaField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import {
  AreaEffectType,
  AttackTrait,
  enumValues,
  ExplosiveSize,
  ExplosiveType,
  WeaponAttackType,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import { ArmorType } from '@src/features/active-armor';
import { checkList } from '@src/features/check-list';
import { prettyMilliseconds } from '@src/features/time';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { cleanFormula } from '@src/foundry/rolls';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property, PropertyValues } from 'lit-element';
import { createPipe, map, mapToObj, objOf } from 'remeda';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './explosive-form.scss';

@customElement('explosive-form')
export class ExplosiveForm extends ItemFormBase {
  explosive: any;
  static get is() {
    return 'explosive-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: Explosive;

  private substanceSheet?: SlWindow | null;

  private substanceSheetKey = {};

  updated(changedProps: PropertyValues) {
    if (this.substanceSheet) this.openSubstanceSheet();
    super.updated(changedProps);
  }

  disconnectedCallback() {
    closeWindow(this.substanceSheetKey);
    this.substanceSheet = null;
    super.disconnectedCallback();
  }

  private addSubstance = handleDrop(async ({ data }) => {
    if (data?.type !== DropType.Item || this.disabled) return;
    const proxy = await itemDropToItemProxy(data);
    if (proxy?.type === ItemType.Substance) {
      this.item.setSubstance(proxy);
    }
  });

  private openSubstanceSheet() {
    const { substance, fullName } = this.item;
    if (!substance) return this.closeSubstanceSheet();
    const { win, wasConnected } = openWindow(
      {
        key: this.substanceSheetKey,
        content: renderItemForm(substance),
        adjacentEl: this,
        forceFocus: !this.substanceSheet,
        name: `[${fullName} ${localize('payload')}] ${substance.fullName}`,
      },
      { resizable: ResizeOption.Vertical },
    );
    this.substanceSheet = win;
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => (this.substanceSheet = null),
        { once: true },
      );
    }
  }

  private closeSubstanceSheet() {
    closeWindow(this.substanceSheetKey);
    this.substanceSheet = null;
  }

  private deleteSubstance() {
    return this.item.removeSubstance();
  }

  render() {
    const {
      updater,
      type,
      loaded,
      attacks,
      canContainSubstance,
      substance,
    } = this.item;
    const { disabled } = this;
    const { commit, originalValue } = updater.prop('data');

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

        ${renderAutoForm({
          props: originalValue(),
          update: ({ explosiveType, ...values }) =>
            commit(
              explosiveType !== undefined
                ? { explosiveType, size: ExplosiveSize.Mini }
                : values,
            ),
          disabled,
          slot: 'sidebar',
          fields: ({
            explosiveType,
            size,
            sticky,
            containSubstance,
            hasSecondaryMode,
            areaEffect: areaEffectType,
            areaEffectRadius: radius,
          }) => [
            renderSelectField(explosiveType, enumValues(ExplosiveType), {
              disabled: loaded,
            }),
            explosiveType.value !== ExplosiveType.Generic
              ? renderSelectField(
                  size,
                  explosiveType.value === ExplosiveType.Missile
                    ? enumValues(ExplosiveSize)
                    : [ExplosiveSize.Mini, ExplosiveSize.Standard],
                  { disabled: loaded },
                )
              : '',
            html`<entity-form-sidebar-divider></entity-form-sidebar-divider>`,
            renderLabeledCheckbox(sticky),
            renderLabeledCheckbox(containSubstance),
            renderLabeledCheckbox({
              ...hasSecondaryMode,
              label: localize('secondaryMode'),
            }),
            html`<entity-form-sidebar-divider></entity-form-sidebar-divider>`,
            renderSelectField(
              areaEffectType,
              [AreaEffectType.Uniform, AreaEffectType.Centered],
              { emptyText: localize('none') },
            ),
            areaEffectType.value === AreaEffectType.Uniform
              ? renderNumberField(
                  { ...radius, label: `${localize('radius')} (m.)` },
                  { min: 2 },
                )
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
                fields: ({ quantity, unitsPerComplexity }) => [
                  loaded
                    ? html`<div></div>`
                    : renderNumberField(quantity, { min: 0 }),
                  renderNumberField(unitsPerComplexity, { min: 1, max: 99 }),
                ],
              })}
            </div>
          </section>

          ${this.renderAttack(attacks.primary, WeaponAttackType.Primary)}
          ${attacks.secondary
            ? this.renderAttack(attacks.secondary, WeaponAttackType.Secondary)
            : ''}
          ${canContainSubstance
            ? html`
                <sl-dropzone ?disabled=${disabled} @drop=${this.addSubstance}>
                  <sl-header
                    heading=${localize('substance')}
                    ?hideBorder=${!substance}
                  ></sl-header>
                  ${substance
                    ? html`
                        <div class="addon">
                          <span class="addon-name">${substance.name}</span>
                          <span class="addon-type">${substance.fullType}</span>
                          <mwc-icon-button
                            icon="launch"
                            @click=${this.openSubstanceSheet}
                          ></mwc-icon-button>
                          <delete-button
                            ?disabled=${disabled}
                            @delete=${this.deleteSubstance}
                          ></delete-button>
                        </div>
                      `
                    : ''}
                </sl-dropzone>
              `
            : ''}
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

  private renderAttack(attack: ExplosiveAttack, type: WeaponAttackType) {
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
          ${attack.duration
            ? html`
                <sl-group label=${localize('duration')}
                  >${prettyMilliseconds(attack.duration, {
                    compact: false,
                  })}</sl-group
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
    const { disabled } = this;
    const modeLabel = localize(
      type === WeaponAttackType.Primary ? 'primaryMode' : 'secondaryMode',
    );
    const [pairedTraits, change] = checkList(
      updater.originalValue().attackTraits,
      enumValues(AttackTrait),
    );
    return html`
      <h3>${modeLabel}</h3>
      ${renderUpdaterForm(updater, {
        disabled,
        fields: ({ damageFormula, armorPiercing, label, armorUsed }) => [
          this.item.hasSecondaryMode
            ? renderTextField(label, { placeholder: modeLabel })
            : '',
          renderFormulaField(damageFormula),
          renderSelectField(armorUsed, [ArmorType.Energy, ArmorType.Kinetic], {
            emptyText: '-',
          }),
          armorUsed.value ? renderLabeledCheckbox(armorPiercing) : '',
        ],
      })}
      <p class="label">${localize('attackTraits')}</p>
      ${renderAutoForm({
        props: pairedTraits,
        update: createPipe(change, objOf("attackTraits"), updater.commit),
        fields: (traits) => map(Object.values(traits), renderLabeledCheckbox),
      })}
      ${renderUpdaterForm(updater, {
        disabled,
        fields: ({ duration, notes }) => [
          renderTimeField(duration, { whenZero: localize('instant') }),
          renderTextareaField(notes),
        ],
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'explosive-form': ExplosiveForm;
  }
}
