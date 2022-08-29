import { DropZone } from '@src/components/dropzone/dropzone';
import {
  renderSelectField,
  emptyTextDash,
  renderLabeledCheckbox,
  renderNumberField,
  renderNumberInput,
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import { openWindow } from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import { enumValues, ExplosiveSize, PhysicalWare } from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import { FiringMode } from '@src/features/firing-modes';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { customElement, html, property, PropertyValues } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { difference, identity, map } from 'remeda';
import { SeekerWeapon } from '../../../proxies/seeker-weapon';
import {
  accessoriesListStyles,
  complexityForm,
  renderComplexityFields,
  renderGearTraitCheckboxes,
  renderRangedAccessoriesEdit,
  renderWeaponTraitCheckboxes,
} from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './seeker-weapon-form.scss';

@customElement('seeker-weapon-form')
export class SeekerWeaponForm extends ItemFormBase {
  static get is() {
    return 'seeker-weapon-form' as const;
  }

  static styles = [
    entityFormCommonStyles,
    complexityForm.styles,
    accessoriesListStyles,
    styles,
  ];

  @property({ attribute: false }) item!: SeekerWeapon;

  private missilesSheet?: SlWindow | null;

  private readonly missilesSheetKey = {};

  update(changedProps: PropertyValues<this>) {
    if (this.missilesSheet) this.openMissilesSheet();
    super.update(changedProps);
  }

  disconnectedCallback() {
    this.closeMissilesSheet();
    super.disconnectedCallback();
  }

  private addDrop = handleDrop(async ({ ev, data }) => {
    if (this.disabled || data?.type !== DropType.Item) return;
    const proxy = await itemDropToItemProxy(data);
    if (proxy?.type === ItemType.Explosive && proxy.isMissile) {
      const alternate =
        ev.currentTarget instanceof DropZone &&
        ev.currentTarget.hasAttribute('data-alternate');
      const { missileSize } = alternate
        ? this.item.alternativeAmmo
        : this.item.primaryAmmo;
      if (missileSize === proxy.size) this.item.setMissiles(proxy);
      else
        notify(
          NotificationType.Error,
          format('CannotLoadMissileSize', {
            missileSize: proxy.formattedSize,
            availableSizes: localize(missileSize),
          }),
        );
    }
  });

  private openMissilesSheet() {
    const { missiles, fullName } = this.item;
    if (!missiles) return this.closeMissilesSheet();
    const { win, wasConnected } = openWindow(
      {
        key: this.missilesSheetKey,
        content: renderItemForm(missiles),
        adjacentEl: this,
        forceFocus: !this.missilesSheet,
        name: `[${fullName} ${localize('coating')}] ${missiles.fullName}`,
      },
      { resizable: ResizeOption.Vertical },
    );

    this.missilesSheet = win;
    if (!wasConnected) {
      win.addEventListener(
        SlWindowEventName.Closed,
        () => (this.missilesSheet = null),
        { once: true },
      );
    }
  }

  private closeMissilesSheet() {
    this.missilesSheet?.close();
    this.missilesSheet = null;
  }

  render() {
    const {
      updater,
      type,
      accessories,
      missiles,
      alternativeAmmo,
      primaryAmmo,
      allowAlternativeAmmo,
    } = this.item;
    const alternativeMissile =
      allowAlternativeAmmo && missiles?.size === alternativeAmmo.missileSize;
    const { disabled } = this;
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

        ${renderUpdaterForm(updater.path('system'), {
          disabled,
          slot: 'sidebar',
          fields: ({ wareType, firingMode, hasAlternativeAmmo, ...traits }) => [
            renderSelectField(
              wareType,
              enumValues(PhysicalWare),
              emptyTextDash,
            ),
            renderSelectField(firingMode, [
              FiringMode.SingleShot,
              FiringMode.SemiAutomatic,
            ]),
            renderLabeledCheckbox(
              {
                ...hasAlternativeAmmo,
                label: localize('alternativeAmmo'),
              },
              { disabled: alternativeMissile },
            ),
            html`<entity-form-sidebar-divider
              label="${localize('weapon')} ${localize('traits')}"
            ></entity-form-sidebar-divider>`,
            renderWeaponTraitCheckboxes(traits),
            html`<entity-form-sidebar-divider
              label=${localize('gearTraits')}
            ></entity-form-sidebar-divider>`,
            renderGearTraitCheckboxes(traits),
          ],
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.path('system'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}

          <sl-dropzone ?disabled=${this.disabled} @drop=${this.addDrop}>
            <sl-header heading=${localize('ammo')}>
              ${missiles && !alternativeMissile
                ? this.renderMissilesQuantityForm(missiles)
                : ''}</sl-header
            >
            ${missiles && !alternativeMissile
              ? this.renderMissiles(missiles)
              : ''}
            ${renderUpdaterForm(updater.path('system', 'primaryAmmo'), {
              disabled,
              classes: 'missile-info-form',
              fields: ({ missileSize, missileCapacity, range }) => [
                renderSelectField(missileSize, enumValues(ExplosiveSize), {
                  disableOptions: allowAlternativeAmmo
                    ? [alternativeAmmo.missileSize]
                    : [],
                  disabled: !!(missiles && !alternativeMissile),
                }),
                renderNumberField(
                  {
                    ...missileCapacity,
                    label: `${localize('base')} ${localize('capacity')}`,
                  },
                  { min: 1 },
                ),
                renderNumberField(range, { min: 1 }),
              ],
            })}
          </sl-dropzone>

          ${allowAlternativeAmmo
            ? html`
                <sl-dropzone
                  ?disabled=${this.disabled}
                  @drop=${this.addDrop}
                  data-alternate
                >
                  <sl-header heading=${localize('alternativeAmmo')}
                    >${missiles && alternativeMissile
                      ? this.renderMissilesQuantityForm(missiles)
                      : ''}</sl-header
                  >
                  ${missiles && alternativeMissile
                    ? this.renderMissiles(missiles)
                    : ''}
                  ${renderUpdaterForm(
                    updater.path('system', 'alternativeAmmo'),
                    {
                      disabled,
                      classes: 'missile-info-form',
                      fields: ({ missileSize, missileCapacity, range }) => [
                        renderSelectField(
                          missileSize,
                          enumValues(ExplosiveSize),
                          {
                            disableOptions: [primaryAmmo.missileSize],
                            disabled: alternativeMissile,
                          },
                        ),
                        renderNumberField(
                          {
                            ...missileCapacity,
                            label: `${localize('base')} ${localize(
                              'capacity',
                            )}`,
                          },
                          { min: 1 },
                        ),
                        renderNumberField(range, { min: 1 }),
                      ],
                    },
                  )}
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
          .updateActions=${updater.path('system', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private renderMissiles(missiles: Explosive) {
    return html`
      <div class="addon">
        <span class="addon-name">${missiles.name}</span>
        <span class="addon-type">${missiles.fullType}</span>
        <mwc-icon-button
          icon="launch"
          @click=${this.openMissilesSheet}
        ></mwc-icon-button>
        <delete-button
          ?disabled=${this.disabled}
          @delete=${missiles.deleteSelf}
        ></delete-button>
      </div>
      <hr />
    `;
  }

  private renderMissilesQuantityForm(missiles: Explosive) {
    const { currentCapacity } = this.item;
    return renderUpdaterForm(missiles.updater.path('system'), {
      disabled: this.disabled,
      classes: 'missiles-quantity-form',
      slot: 'action',
      fields: ({ quantity }) => html`
        <mwc-formfield alignEnd label=${quantity.label}
          >${renderNumberInput(
            { ...quantity, value: Math.min(quantity.value, currentCapacity) },
            {
              min: 0,
              max: currentCapacity,
            },
          )}</mwc-formfield
        >
        <span class="capacity">/ ${currentCapacity}</span>
      `,
    });
  }

  private renderAccessoriesEdit() {
    return renderRangedAccessoriesEdit(
      this.item.accessories,
      SeekerWeapon.possibleAccessories,
      this.item.updater.path('system', 'accessories').commit,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'seeker-weapon-form': SeekerWeaponForm;
  }
}
