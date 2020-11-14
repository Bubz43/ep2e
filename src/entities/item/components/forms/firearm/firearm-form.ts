import {
  formatLabeledFormulas,
  formatArmorUsed,
} from '@src/combat/attack-formatting';
import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
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
  enumValues,
  KineticWeaponClass,
  RangedWeaponAccessory,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import { Firearm } from '@src/entities/item/proxies/firearm';
import { pairList } from '@src/features/check-list';
import { matchID } from '@src/features/feature-helpers';
import { FiringMode } from '@src/features/firing-modes';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property, PropertyValues } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { createPipe, identity, objOf } from 'remeda';
import {
  accessoriesListStyles,
  complexityForm,
  renderComplexityFields,
  renderKineticAttackEdit,
  renderKineticWeaponSidebar,
  renderRangedAccessoriesEdit,
} from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './firearm-form.scss';

@customElement('firearm-form')
export class FirearmForm extends ItemFormBase {
  static get is() {
    return 'firearm-form' as const;
  }

  static styles = [
    entityFormCommonStyles,
    complexityForm.styles,
    accessoriesListStyles,
    styles,
  ];

  @property({ attribute: false }) item!: Firearm;

  private ammoSheet?: SlWindow | null;

  private readonly ammoSheetKey = {};

  update(changedProps: PropertyValues) {
    if (this.ammoSheet) this.openAmmoSheet();

    super.update(changedProps);
  }

  disconnectedCallback() {
    this.closeCoatingSheet();
    super.disconnectedCallback();
  }

  private addDrop = handleDrop(async ({ ev, data }) => {
    if (this.disabled) return;
    if (data?.type === DropType.Item) {
      const agent = await itemDropToItemProxy(data);
      if (agent?.type === ItemType.FirearmAmmo) {
        this.item.setSpecialAmmo(agent);
      }
    }
  });

  private openAmmoSheet() {
    const { specialAmmo, fullName } = this.item;
    if (!specialAmmo) return this.closeCoatingSheet();
    const { win, wasConnected } = openWindow(
      {
        key: this.ammoSheetKey,
        content: renderItemForm(specialAmmo),
        adjacentEl: this,
        forceFocus: !this.ammoSheet,
        name: `[${fullName} ${localize('ammo')}] ${specialAmmo.fullName}`,
      },
      { resizable: ResizeOption.Vertical },
    );

    this.ammoSheet = win;
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => (this.ammoSheet = null),
        { once: true },
      );
    }
  }

  private closeCoatingSheet() {
    this.ammoSheet?.close();
    this.ammoSheet = null;
  }

  render() {
    const {
      updater,
      type,
      accessories,
      specialAmmo,
      magazineModifiers,
      ammoState,
      specialAmmoModeIndex,
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
          fields: renderKineticWeaponSidebar,
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.prop('data'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}
          ${this.renderAttack()}

          <sl-dropzone @drop=${this.addDrop} ?disabled=${disabled}>
            <sl-header heading=${localize('ammo')}></sl-header>
            ${renderUpdaterForm(updater.prop('data', 'ammo'), {
              disabled,
              classes: 'ammo-form',
              fields: ({ value, max, ammoClass }) => [
                renderSelectField(
                  { ...ammoClass, label: localize('class') },
                  enumValues(KineticWeaponClass),
                ),

                renderNumberField(
                  {
                    ...max,
                    label: `${
                      magazineModifiers.capacityChanged ? localize('base') : ''
                    } ${localize('capacity')}`,
                  },
                  { min: 1, max: 200 },
                ),
                specialAmmo?.hasMultipleModes
                  ? ''
                  : renderNumberField(
                      {
                        ...value,
                        value: Math.min(ammoState.max + 1, value.value),
                        label: localize('loaded'),
                      },
                      {
                        min: 0,
                        max: ammoState.max + 1,
                        helpPersistent: true,
                        helpText: `${localize('capacity')}: ${
                          ammoState.max
                        } + 1`,
                      },
                    ),
              ],
            })}
            ${specialAmmo?.hasMultipleModes
              ? this.renderProgrammableAmmoForm()
              : ''}
            ${specialAmmo
              ? html`
                  <div class="addon">
                    <span class="addon-name"
                      >${specialAmmo.name}
                      ${specialAmmo.hasMultipleModes
                        ? `(${
                            specialAmmo.findMode(specialAmmoModeIndex)?.name ||
                            `${localize('form')} ${specialAmmoModeIndex + 1}`
                          })`
                        : ''}</span
                    >
                    <span class="addon-type">${specialAmmo.fullType}</span>
                    <div class="actions">${specialAmmo.hasMultipleModes
                      ? html` <mwc-icon-button
                          icon="transform"
                          class="transform-button"
                          @click=${this.setDrawerFromEvent(
                            this.renderAmmoTransformer,
                          )}
                          ?disabled=${disabled}
                        ></mwc-icon-button>`
                      : ''}
                    <mwc-icon-button
                      icon="launch"
                      @click=${this.openAmmoSheet}
                    ></mwc-icon-button></div>
                    <delete-button
                      ?disabled=${disabled}
                      @delete=${specialAmmo.deleteSelf}
                    ></delete-button>
                  </div>
                `
              : ''}
          </sl-dropzone>

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
          .updateActions=${updater.prop('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private renderAmmoTransformer() {
    const { specialAmmo } = this.item;
    return html`
      <h3>${localize('ammo')} ${localize('transformer')}</h3>
      ${specialAmmo?.hasMultipleModes
        ? html`<firearm-ammo-transformer
            .firearm=${this.item}
            .ammo=${specialAmmo}
          ></firearm-ammo-transformer>`
        : ''}
    `;
  }

  private renderProgrammableAmmoForm() {
    const { specialAmmo, ammoState, specialAmmoModeIndex } = this.item;
    if (!specialAmmo) return '';
    const activeMode = specialAmmo.findMode(specialAmmoModeIndex)!;
    const ammoForms = new Map(
      specialAmmo.modes.map(({ id, name }) => [id, name]),
    );

    return html`
      ${renderAutoForm({
        classes: 'mode-settings',
        props: {
          loaded: ammoState.value,
          mode: activeMode.id,
        },
        update: ({ loaded, mode }) => {
          if (loaded !== undefined) this.item.updateAmmoCount(loaded);
          else {
            const index = this.item.specialAmmo?.modes.findIndex(matchID(mode));
            if (typeof index === 'number' && index !== -1)
              this.item.updater
                .prop('data', 'ammo', 'selectedModeIndex')
                .commit(index);
          }
        },
        fields: ({ loaded, mode }) => [
          renderSelectField(mode, [...ammoForms.keys()], {
            altLabel: (modeId) => ammoForms.get(modeId) || localize('mode'),
          }),
          renderNumberField(
            {
              ...loaded,
              value: Math.min(ammoState.max + 1, loaded.value),
            },
            {
              min: 0,
              max: ammoState.max + 1,
              helpPersistent: true,
              helpText: `${localize('capacity')}: ${ammoState.max} + 1`,
            },
          ),
        ],
      })}
    `;
  }

  private renderAttack() {
    const { primary: attack } = this.item.attacks;
    return html`
      <section>
        <sl-header heading=${localize('attack')}>
          <mwc-icon-button
            slot="action"
            icon="edit"
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

          <sl-group label=${localize('firingModes')} class="firing-modes"
            >${attack.firingModes
              .map((mode) => localize('SHORT', mode))
              .join('/')}</sl-group
          >

          ${attack.notes
            ? html`
                <sl-group class="attack-notes" label=${localize('notes')}>
                  ${attack.notes}</sl-group
                >
              `
            : ''}
        </div>


        // TODO Show Ammo Effects
      </section>
    `;
  }

  private renderAttackEdit() {
    return renderKineticAttackEdit(
      this.item.updater.prop('data', 'primaryAttack'),
    );
  }

  private renderAccessoriesEdit() {
    return renderRangedAccessoriesEdit(
      this.item.accessories,
      enumValues(RangedWeaponAccessory),
      this.item.updater.prop('data', 'accessories').commit,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'firearm-form': FirearmForm;
  }
}
