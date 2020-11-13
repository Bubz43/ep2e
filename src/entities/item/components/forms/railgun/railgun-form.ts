import {
  formatLabeledFormulas,
  formatArmorUsed,
} from '@src/combat/attack-formatting';
import {
  renderNumberField,
  renderSelectField,
  renderLabeledCheckbox,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import {
  enumValues,
  KineticWeaponClass,
  PhysicalWare,
  RangedWeaponAccessory,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { Railgun } from '@src/entities/item/proxies/railgun';
import { checkList } from '@src/features/check-list';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { createPipe, identity, map, mapToObj } from 'remeda';
import {
  complexityForm,
  renderComplexityFields,
  renderGearTraitCheckboxes,
} from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './railgun-form.scss';

@customElement('railgun-form')
export class RailgunForm extends ItemFormBase {
  static get is() {
    return 'railgun-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: Railgun;

  render() {
    const { updater, type, accessories } = this.item;
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
          fields: ({ wareType, range, fixed, long, ...traits }) => [
            renderSelectField(wareType, enumValues(PhysicalWare), {
              emptyText: '-',
            }),
            renderNumberField(
              { ...range, label: `${range.label} (${localize('meters')})` },
              { min: 1 },
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
    return html``;
  }

  private renderAccessoriesEdit() {
    const [pairedAccessories, change] = checkList(
      this.item.accessories,
      enumValues(RangedWeaponAccessory),
    );
    return html`
      <h3>${localize('accessories')}</h3>
      ${renderAutoForm({
        props: pairedAccessories,
        update: createPipe(
          change,
          this.item.updater.prop('data', 'accessories').commit,
        ),
        fields: (accessories) =>
          map(Object.values(accessories), renderLabeledCheckbox),
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'railgun-form': RailgunForm;
  }
}
