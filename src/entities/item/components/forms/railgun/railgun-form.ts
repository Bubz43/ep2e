import {
  formatLabeledFormulas,
  formatArmorUsed,
} from '@src/combat/attack-formatting';
import {
  renderNumberField,
  renderSelectField,
  renderLabeledCheckbox,
  renderTimeField,
  renderFormulaField,
  renderTextareaField,
  renderTextInput,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import {
  enumValues,
  KineticWeaponClass,
  PhysicalWare,
  RangedWeaponAccessory,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { Railgun } from '@src/entities/item/proxies/railgun';
import { pairList } from '@src/features/check-list';
import { idProp } from '@src/features/feature-helpers';
import { FiringMode } from '@src/features/firing-modes';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { createPipe, identity, map, mapToObj, objOf } from 'remeda';
import {
  accessoriesListStyles,
  complexityForm,
  renderComplexityFields,
  renderGearTraitCheckboxes,
  renderKineticAttackEdit,
  renderKineticWeaponSidebar,
  renderRangedAccessoriesEdit,
} from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './railgun-form.scss';

@customElement('railgun-form')
export class RailgunForm extends ItemFormBase {
  static get is() {
    return 'railgun-form' as const;
  }

  static styles = [
    entityFormCommonStyles,
    complexityForm.styles,
    accessoriesListStyles,
    styles,
  ];

  @property({ attribute: false }) item!: Railgun;

  private renderSidebarFields = renderKineticWeaponSidebar.bind(this);

  private addShape = handleDrop(async ({ data }) => {
    if (
      this.disabled ||
      !this.item.shapeChanging ||
      data?.type !== DropType.Item
    )
      return;
    const proxy = await itemDropToItemProxy(data);
    if (proxy?.type === this.item.type) {
      this.item.addShape(proxy.getDataCopy(false));
    }
  });

  private openShapeMenu(ev: MouseEvent, shape: Railgun) {
    openMenu({
      content: [
        // TODO Shape Form
        {
          label: `${localize("delete")} ${localize("shape")}`,
          callback: () => this.item.removeShape(shape.id)
        }
      ],
      position: ev,
    });
  }

  render() {
    const { updater, type, accessories, shapeChanging, shapeName, nestedShape } = this.item;
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
          fields: this.renderSidebarFields,
        })}

        <div slot="details">
          ${shapeChanging && !nestedShape
            ? html`
                <sl-dropzone ?disabled=${disabled} @drop=${this.addShape}>
                  <sl-header
                    heading=${localize('shapes')}
                    ?hideBorder=${this.item.shapes.size === 0}
                  >
                    ${renderAutoForm({
                      props: { shapeName },
                      slot: 'action',
                      classes: 'shape-name-form',
                      update: ({ shapeName }) => {
                        this.item.updater
                          .prop('data', 'shapeName')
                          .commit(shapeName || this.item.shapeName)
                        this.requestUpdate();
                      }
                        ,
                      disabled,
                      fields: ({ shapeName }) =>
                        html`<mwc-formfield alignEnd label=${shapeName.label}
                          >${renderTextInput(shapeName)}</mwc-formfield
                        >`,
                    })}
                  </sl-header>
                  ${notEmpty(this.item.shapes)
                    ? html`
                        <sl-animated-list class="shapes">
                          ${repeat(
                            this.item.shapes.values(),
                            idProp,
                            (shape) => {
                              const { id, name } = shape;
                              return html`
                              <wl-list-item
                                class="shape"
                                clickable
                                ?disabled=${disabled}
                                @click=${() => this.item.swapShape(id)}
                                @contextmenu=${(ev: MouseEvent) => this.openShapeMenu(ev, shape)}
                                >${name}</wl-list-item
                              >
                            `;
                            },
                          )}
                        </sl-animated-list>
                      `
                    : ''}
                </sl-dropzone>
              `
            : ''}
          ${renderUpdaterForm(updater.prop('data'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}
          ${this.renderAttack()}

          <section>
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
                  { ...max, label: `${localize('capacity')}` },
                  { min: 1 },
                ),
                renderNumberField(
                  {
                    ...value,
                    value: Math.min(max.value + 1, value.value),
                    label: localize('loaded'),
                  },
                  { min: 0, max: max.value + 1 },
                ),
              ],
            })}
          </section>

          <section>
            <sl-header heading=${localize('battery')}></sl-header>
            ${renderUpdaterForm(updater.prop('data', 'battery'), {
              disabled,
              classes: 'battery-form',
              fields: ({ charge, recharge, max }) => [
                renderNumberField(max, { min: 1 }),
                renderNumberField(
                  { ...charge, value: Math.min(max.value, charge.value) },
                  { min: 0, max: max.value },
                ),
                renderTimeField(
                  {
                    ...recharge,
                    label: `${localize('progressTowards')} ${localize(
                      'recharge',
                    )}`,
                  },
                  { min: 0, max: toMilliseconds({ hours: 4 }) },
                ),
              ],
            })}
          </section>

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
      Railgun.possibleAccessories,
      this.item.updater.prop('data', 'accessories').commit,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'railgun-form': RailgunForm;
  }
}
