import {
  formatAreaEffect,
  formatArmorUsed,
  formatLabeledFormulas,
} from '@src/combat/attack-formatting';
import type { BeamWeaponAttack } from '@src/combat/attacks';
import {
  emptyTextDash,
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
  renderTextareaField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import {
  AreaEffectType,
  AttackTrait,
  enumValues,
  PhysicalWare,
  WeaponAttackType,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { BeamWeapon } from '@src/entities/item/proxies/beam-weapon';
import { pairList } from '@src/features/check-list';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import mix from 'mix-with/lib';
import { createPipe, identity, map, objOf } from 'remeda';
import {
  accessoriesListStyles,
  complexityForm,
  renderComplexityFields,
  renderFiringModeCheckboxes,
  renderGearTraitCheckboxes,
  renderRangedAccessoriesEdit,
  renderWeaponTraitCheckboxes,
} from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './beam-weapon-form.scss';

class Base extends ItemFormBase {
  @property({ attribute: false }) item!: BeamWeapon;
}

@customElement('beam-weapon-form')
export class BeamWeaponForm extends mix(Base).with(UseWorldTime) {
  static get is() {
    return 'beam-weapon-form' as const;
  }

  static styles = [
    entityFormCommonStyles,
    complexityForm.styles,
    accessoriesListStyles,
    styles,
  ];

  render() {
    const { updater, type, accessories, attacks } = this.item;
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
          fields: ({ wareType, range, hasSecondaryAttack, ...traits }) => [
            renderSelectField(
              wareType,
              enumValues(PhysicalWare),
              emptyTextDash,
            ),
            renderNumberField(
              { ...range, label: `${range.label} (${localize('meters')})` },
              { min: 1 },
            ),
            renderLabeledCheckbox({
              ...hasSecondaryAttack,
              label: localize('secondaryAttack'),
            }),
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
          ${this.renderAttack(attacks.primary, WeaponAttackType.Primary)}
          ${attacks.secondary
            ? this.renderAttack(attacks.secondary, WeaponAttackType.Secondary)
            : ''}

          <section>
            <sl-header heading=${localize('battery')}></sl-header>
            ${renderAutoForm({
              props: this.item.battery,
              update: (changed) => this.item.updateCharge(changed),
              disabled,
              classes: 'battery-form',
              fields: ({ charge, max }) => [
                renderNumberField(max, { min: 1 }),
                renderNumberField(
                  { ...charge, value: Math.min(max.value, charge.value) },
                  { min: 0, max: max.value },
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
          .updateActions=${updater.path('system', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private renderAttack(attack: BeamWeaponAttack, type: WeaponAttackType) {
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

          ${attack.areaEffect
            ? html`
                <sl-group class="attack-area" label=${localize('areaEffect')}>
                  ${formatAreaEffect(attack)}
                </sl-group>
              `
            : ''}
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
    const updater = this.item.updater.path('system', type);
    const { hasSecondaryAttack } = this.item;
    const [pairedTraits, changeTraits] = pairList(
      updater.originalValue().attackTraits,
      enumValues(AttackTrait),
    );
    return html`
      <h3>${localize(hasSecondaryAttack ? type : 'attack')}</h3>
      ${renderUpdaterForm(updater, {
        classes: 'drawer-attack',
        fields: ({
          label,
          damageFormula,
          armorPiercing,
          areaEffect,
          areaEffectRadius,
        }) => [
          renderTextField(label, { placeholder: localize(type) }),
          html`<div class="area-effect-fields">
            ${[
              renderSelectField(areaEffect, enumValues(AreaEffectType), {
                emptyText: localize('none'),
              }),
              areaEffect.value === AreaEffectType.Uniform
                ? renderNumberField(
                    {
                      ...areaEffectRadius,
                      label: `${localize('radius')} (${
                        localize('meters').toLocaleLowerCase()[0]
                      })`,
                    },
                    { min: 1 },
                  )
                : '',
            ]}
          </div>`,
          renderFormulaField(damageFormula),
          renderLabeledCheckbox(armorPiercing),
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
      BeamWeapon.possibleAccessories,
      this.item.updater.path('system', 'accessories').commit,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'beam-weapon-form': BeamWeaponForm;
  }
}
