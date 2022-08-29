import {
  emptyTextDash,
  renderLabeledCheckbox,
  renderNumberField,
  renderSelectField,
  renderTextareaField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import { enumValues, AttackTrait, PhysicalWare } from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { Armor } from '@src/entities/item/proxies/armor';
import { pairList } from '@src/features/check-list';
import type { EffectCreatedEvent } from '@src/features/components/effect-creator/effect-created-event';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import type { ArmorValues } from '@src/foundry/template-schema';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import { createPipe, objOf, map } from 'remeda';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './armor-form.scss';

const renderArmorValuesFields: FieldPropsRenderer<ArmorValues> = ({
  energy,
  kinetic,
  concealable,
  layerable,
}) => [
  [energy, kinetic].map((type) => renderNumberField(type, { min: 0 })),
  html`<div>${map([layerable, concealable], renderLabeledCheckbox)}</div>`,
];

@customElement('armor-form')
export class ArmorForm extends ItemFormBase {
  static get is() {
    return 'armor-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: Armor;

  private readonly effectsOps = addUpdateRemoveFeature(
    () => this.item.updater.path('system', 'effects').commit,
  );

  private addCreatedEffect(ev: EffectCreatedEvent) {
    this.effectsOps.add({}, ev.effect);
  }

  render() {
    const { updater, type, attackTraits, hasActiveState, effects } = this.item;
    const { disabled } = this;
    const [pairedTraits, changeTraits] = pairList(
      attackTraits,
      enumValues(AttackTrait),
    );
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
          fields: ({
            wareType,
            hasActiveState,
            singleUse,
            fragile,
            twoHanded,
          }) => [
            renderSelectField(
              wareType,
              enumValues(PhysicalWare),
              emptyTextDash,
            ),
            renderLabeledCheckbox(hasActiveState),
            html`<entity-form-sidebar-divider
              label=${localize('gearTraits')}
            ></entity-form-sidebar-divider>`,
            map([singleUse, fragile, twoHanded], renderLabeledCheckbox),
          ],
        })}

        <entity-form-sidebar-divider
          slot="sidebar"
          label=${localize('attackTraits')}
        ></entity-form-sidebar-divider>

        ${renderAutoForm({
          props: pairedTraits,
          disabled,
          slot: 'sidebar',
          update: createPipe(
            changeTraits,
            updater.path('system', 'attackTraits').commit,
          ),
          fields: (traits) => map(Object.values(traits), renderLabeledCheckbox),
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.path('system'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}

          <div class="both-values">
            <section>
              <sl-header
                heading="${localize('armor')} ${localize('values')}"
              ></sl-header>
              ${renderUpdaterForm(updater.path('system', 'armorValues'), {
                disabled,
                classes: `armor-values-form ${hasActiveState ? '' : 'solo'}`,
                fields: renderArmorValuesFields,
              })}
            </section>

            ${hasActiveState
              ? html`
                  <section>
                    <sl-header
                      heading="${localize('when')} ${localize('activated')}"
                    ></sl-header>
                    ${renderUpdaterForm(updater.path('system', 'activeArmor'), {
                      disabled,
                      classes: 'armor-values-form',
                      fields: renderArmorValuesFields,
                    })}
                  </section>
                `
              : ''}
          </div>

          <section>
            <sl-header
              heading=${localize('effects')}
              ?hideBorder=${effects.length === 0}
              ><mwc-icon-button
                icon="add"
                slot="action"
                @click=${this.setDrawerFromEvent(this.renderEffectCreator)}
                ?disabled=${disabled}
              ></mwc-icon-button
            ></sl-header>
            ${notEmpty(effects)
              ? html`
                  <item-form-effects-list
                    .effects=${effects}
                    .operations=${this.effectsOps}
                    ?disabled=${disabled}
                  ></item-form-effects-list>
                `
              : ''}
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

  private renderEffectCreator() {
    return html`
      <h3>${localize('add')} ${localize('effect')}</h3>

      <effect-creator @effect-created=${this.addCreatedEffect}></effect-creator>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'armor-form': ArmorForm;
  }
}
