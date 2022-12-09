import {
  formatArmorUsed,
  formatLabeledFormulas,
} from '@src/combat/attack-formatting';
import type { ThrownWeaponAttack } from '@src/combat/attacks';
import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderRadioFields,
  renderTextareaField,
  renderTextInput,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import type { SlWindow } from '@src/components/window/window';
import { openWindow } from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import { AttackTrait, enumValues, WeaponSkillOption } from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import type { ThrownWeapon } from '@src/entities/item/proxies/thrown-weapon';
import { SkillType } from '@src/features/skills';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  property,
  PropertyValues,
  state,
} from 'lit-element';
import { map, mapToObj } from 'remeda';
import {
  complexityForm,
  renderComplexityFields,
  renderGearTraitCheckboxes,
} from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './thrown-weapon-form.scss';

@customElement('thrown-weapon-form')
export class ThrownWeaponForm extends ItemFormBase {
  static get is() {
    return 'thrown-weapon-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: ThrownWeapon;

  @state() private skillOption = WeaponSkillOption.None;

  private coatingSheet?: SlWindow | null;

  private coatingSheetKey = {};

  connectedCallback() {
    this.skillOption = this.item.exoticSkillName
      ? WeaponSkillOption.Exotic
      : WeaponSkillOption.None;
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.closeCoatingSheet();
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues<this>) {
    if (this.coatingSheet) this.openCoatingSheet();
    super.updated(changedProps);
  }

  private addDrop = handleDrop(async ({ ev, data }) => {
    if (this.disabled) return;
    const type = (ev.currentTarget as HTMLElement).dataset['drop'];
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
          this.item.setCoating(agent);
        }
      }
    }
  });

  private openCoatingSheet() {
    const { coating, fullName } = this.item;
    if (!coating) return this.closeCoatingSheet();
    const { win, wasConnected } = openWindow(
      {
        key: this.coatingSheetKey,
        content: renderItemForm(coating),
        adjacentEl: this,
        forceFocus: !this.coatingSheet,
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

  render() {
    const { updater, type, coating, exoticSkillName } = this.item;
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
          fields: renderGearTraitCheckboxes,
        })}

        <div slot="details">
          <section>
            <sl-header heading=${localize('details')}></sl-header>
            <div class="detail-forms">
              ${renderAutoForm({
                classes: 'skill-form',
                disabled,
                props: {
                  skillOption: this.skillOption,
                  exotic: exoticSkillName,
                },
                update: ({ skillOption, exotic }) => {
                  if (exotic !== undefined) {
                    this.item.updater
                      .path('system', 'exoticSkill')
                      .commit(exotic);
                  } else if (skillOption === WeaponSkillOption.None) {
                    this.skillOption = skillOption;
                    this.item.updater.path('system', 'exoticSkill').commit('');
                  } else if (skillOption) {
                    this.skillOption = skillOption;
                    if (
                      skillOption === WeaponSkillOption.Exotic &&
                      !this.item.exoticSkillName
                    ) {
                      this.item.updater
                        .path('system', 'exoticSkill')
                        .commit(this.item.name);
                    }
                  }
                },
                fields: ({ skillOption, exotic }) => html`
                  <span class="radio-wrapper"
                    >${localize('skill')}
                    ${renderRadioFields(
                      skillOption,
                      enumValues(WeaponSkillOption),
                      {
                        altLabel: (option) =>
                          option === WeaponSkillOption.None
                            ? localize(SkillType.Athletics)
                            : localize(option),
                      },
                    )}
                  </span>
                  ${renderTextInput(exotic, {
                    placeholder: `e.g. ${this.item.name}`,
                    disabled: this.skillOption !== WeaponSkillOption.Exotic,
                  })}
                `,
              })}
              ${renderUpdaterForm(updater.path('system'), {
                classes: complexityForm.cssClass,
                disabled,
                fields: renderComplexityFields,
              })}
              ${renderUpdaterForm(updater.path('system'), {
                disabled,
                classes: 'quantity-form',
                fields: ({ quantity, quantityPerCost }) => [
                  renderNumberField(quantity, { min: 0, max: 9999 }),
                  renderNumberField(quantityPerCost, { min: 1 }),
                ],
              })}
            </div>
          </section>

          ${this.renderAttack(this.item.attacks.primary)}

          <sl-dropzone ?disabled=${disabled} @drop=${this.addDrop}>
            <sl-header heading=${localize('coating')} ?hideBorder=${!coating}
              ><mwc-icon
                slot="info"
                data-ep-tooltip="${localize('drop')} ${localize(
                  'non-electronic',
                )} ${localize('substance')}"
                @mouseenter=${tooltip.fromData}
                >info</mwc-icon
              ></sl-header
            >
            ${coating
              ? html`
                  <div class="addon">
                    <span class="addon-name">${coating.name}</span>
                    <span class="addon-type">${coating.fullType}</span>
                    <mwc-icon-button
                      icon="launch"
                      @click=${this.openCoatingSheet}
                    ></mwc-icon-button>
                    <delete-button
                      ?disabled=${disabled}
                      @delete=${this.deleteCoating}
                    ></delete-button>
                  </div>
                `
              : ''}
          </sl-dropzone>
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

  private renderAttack(attack: ThrownWeaponAttack) {
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
    const updater = this.item.updater.path('system', 'primaryAttack');
    const { disabled } = this;
    const { attackTraits } = updater.originalValue();
    const attackTraitsObj = mapToObj(enumValues(AttackTrait), (trait) => [
      trait,
      attackTraits.includes(trait),
    ]);
    return html`
      <h3>${localize('attack')}</h3>
      ${renderUpdaterForm(updater, {
        disabled,
        fields: ({ damageFormula, armorPiercing }) => [
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
              const active = traits[trait] ?? attackTraitsObj[trait];
              return active ? trait : [];
            }),
          }),
        fields: (traits) => map(Object.values(traits), renderLabeledCheckbox),
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
    'thrown-weapon-form': ThrownWeaponForm;
  }
}
