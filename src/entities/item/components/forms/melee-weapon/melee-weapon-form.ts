import {
  formatArmorUsed,
  formatLabeledFormulas,
} from '@src/combat/attack-formatting';
import type { MeleeWeaponAttack } from '@src/combat/attacks';
import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderRadioFields,
  renderSelectField,
  renderTextareaField,
  renderTextField,
  renderTextInput,
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
  WeaponAttackType,
  WeaponSkillOption,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import { ItemType } from '@src/entities/entity-types';
import { renderItemForm } from '@src/entities/item/item-views';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import { ArmorType } from '@src/features/active-armor';
import { pairList } from '@src/features/check-list';
import { SkillType } from '@src/features/skills';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  property,
  PropertyValues,
  state,
} from 'lit-element';
import { createPipe, map, objOf } from 'remeda';
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

  @state() private skillOption = WeaponSkillOption.None;

  private coatingSheet?: SlWindow | null;

  private payloadSheet?: SlWindow | null;

  private coatingSheetKey = {};

  private payloadSheetKey = {};

  connectedCallback() {
    this.skillOption = this.item.exoticSkillName
      ? WeaponSkillOption.Exotic
      : WeaponSkillOption.None;
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.closeCoatingSheet();
    this.closePayloadSheet();
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues<this>) {
    if (this.coatingSheet) this.openCoatingSheet();
    if (this.payloadSheet) this.openPayloadSheet();
    super.updated(changedProps);
  }

  private addDrop = handleDrop(async ({ ev, data }) => {
    if (this.disabled) return;
    const type = (ev.currentTarget as HTMLElement).dataset['drop'];
    if (data?.type === DropType.Item) {
      const agent = await itemDropToItemProxy(data);
      if (agent?.type === ItemType.Explosive) {
        if (this.item.acceptsPayload && type === 'payload')
          this.item.setPayload(agent);
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

  private openPayloadSheet() {
    const { payload, fullName } = this.item;
    if (!payload) return this.closeCoatingSheet();
    const { win, wasConnected } = openWindow(
      {
        key: this.payloadSheetKey,
        content: renderItemForm(payload),
        adjacentEl: this,
        forceFocus: !this.payloadSheet,
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
      exoticSkillName,
      permanentCoating,
      damageIrrespectiveOfSize,
    } = this.item;
    const { disabled } = this;

    const armorUsedProps = { armorUsed: this.item.armorUsed } as const;

    return html`
      <entity-form-layout>
        <entity-form-header
          noDefaultImg
          slot="header"
          .updateActions=${updater.path('')}
          type=${localize(type)}
          ?disabled=${disabled}
        >
          ${damageIrrespectiveOfSize
            ? html`<li
                slot="tag"
                @mouseover=${tooltip.fromData}
                data-ep-tooltip=${localize(
                  'DESCRIPTIONS',
                  'IgnoreSizeMeleeDamageModifiers',
                )}
              >
                ${localize('damageIrrespectiveOfSize')}
              </li>`
            : ''}
          ${permanentCoating
            ? html`<li
                slot="tag"
                @mouseover=${tooltip.fromData}
                data-ep-tooltip=${localize(
                  'DESCRIPTIONS',
                  'PermanentMeleeCoatings',
                )}
              >
                ${localize('permanentCoating')}
              </li>`
            : ''}
          <mwc-icon-button
            slot="settings"
            icon="settings"
            ?disabled=${disabled}
            @click=${this.setDrawerFromEvent(this.renderOverridesForm)}
          ></mwc-icon-button>
        </entity-form-header>

        ${renderUpdaterForm(updater.path('system'), {
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
          <section>
            <sl-header heading=${localize('details')}></sl-header>
            <div class="detail-forms">
              ${renderUpdaterForm(updater.path('system'), {
                disabled,
                classes: complexityForm.cssClass,
                fields: renderComplexityFields,
              })}
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
                            ? localize(SkillType.Melee)
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
              ${renderAutoForm({
                props: armorUsedProps,
                update: ({ armorUsed }) => {
                  this.item.updater
                    .path('flags', EP.Name, 'attackArmorUsed')
                    .commit(armorUsed);
                },
                fields: ({ armorUsed }) =>
                  renderSelectField(armorUsed, [
                    ArmorType.Kinetic,
                    ArmorType.Energy,
                  ]),
              })}
            </div>
          </section>
        </div>

        <sl-animated-list slot="details" skipExitAnimation>
          ${this.renderAttack(attacks.primary, WeaponAttackType.Primary)}
          ${attacks.secondary
            ? this.renderAttack(attacks.secondary, WeaponAttackType.Secondary)
            : ''}
        </sl-animated-list>

        <sl-animated-list slot="details" class="addons">
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
          ${acceptsPayload
            ? html`
                <sl-dropzone
                  ?disabled=${disabled}
                  data-drop="payload"
                  @drop=${this.addDrop}
                >
                  <sl-header
                    heading=${localize('payload')}
                    ?hideBorder=${!payload}
                    ><mwc-icon
                      slot="info"
                      data-ep-tooltip="${localize('drop')} ${localize(
                        'any',
                      )} ${localize('explosive')}"
                      @mouseenter=${tooltip.fromData}
                      >info</mwc-icon
                    ></sl-header
                  >
                  ${payload
                    ? html`
                        <div class="addon">
                          <span class="addon-name">${payload.name}</span>
                          <span class="addon-type">${payload.fullType}</span>
                          <mwc-icon-button
                            icon="launch"
                            @click=${this.openPayloadSheet}
                          ></mwc-icon-button>
                          <delete-button
                            ?disabled=${disabled}
                            @delete=${this.deletePayload}
                          ></delete-button>
                        </div>
                      `
                    : ''}
                </sl-dropzone>
              `
            : ''}
        </sl-animated-list>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.path('system', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private renderOverridesForm() {
    const { permanentCoating, damageIrrespectiveOfSize } = this.item;
    return html`
      <h3>${localize('overrides')}</h3>
      ${renderAutoForm({
        props: { permanentCoating, damageIrrespectiveOfSize },
        update: this.item.updater.path('flags', EP.Name).commit,
        fields: ({ permanentCoating, damageIrrespectiveOfSize }) => [
          renderLabeledCheckbox(permanentCoating),
          html`<p>${localize('DESCRIPTIONS', 'PermanentMeleeCoatings')}</p>`,

          renderLabeledCheckbox(damageIrrespectiveOfSize),
          html`<p>
            ${localize('DESCRIPTIONS', 'IgnoreSizeMeleeDamageModifiers')}
          </p>`,
        ],
      })}
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
                  formatLabeledFormulas(attack.rollFormulas),
                  formatArmorUsed(attack),
                ].join('; ')
              : this.item.augmentUnarmed
              ? ''
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
    const updater = this.item.updater.path('system', type);
    const { hasSecondaryAttack } = this.item;
    const { disabled } = this;
    const [pairedTraits, change] = pairList(
      updater.originalValue().attackTraits,
      enumValues(AttackTrait),
    );
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
        props: pairedTraits,
        update: createPipe(change, objOf('attackTraits'), updater.commit),
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
    'melee-weapon-form': MeleeWeaponForm;
  }
}
