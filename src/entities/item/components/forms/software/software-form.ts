import {
  formatLabeledFormulas,
  formatArmorUsed,
} from '@src/combat/attack-formatting';
import type { SoftwareAttack } from '@src/combat/attacks';
import {
  emptyTextDash,
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderRadioFields,
  renderSelectField,
  renderTextareaField,
  renderTextField,
} from '@src/components/field/fields';
import {
  renderAutoForm,
  renderSubmitForm,
  renderUpdaterForm,
} from '@src/components/form/forms';
import {
  AptitudeType,
  AttackTrait,
  enumValues,
  SoftwareType,
  WeaponAttackType,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { Software } from '@src/entities/item/proxies/software';
import { ActionType } from '@src/features/actions';
import {
  CheckResultState,
  formatAptitudeCheckInfo,
  formatCheckResultInfo,
} from '@src/features/aptitude-check-result-info';
import { pairList } from '@src/features/check-list';
import type { AptitudeCheckInfoUpdateEvent } from '@src/features/components/aptitude-check-info-editor/aptitude-check-info-update-event';
import type { EffectCreatedEvent } from '@src/features/components/effect-creator/effect-created-event';
import { EffectType } from '@src/features/effects';
import { addUpdateRemoveFeature, idProp } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import { formatDamageType, HealthType } from '@src/health/health';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  property,
  PropertyValues,
} from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import { compact, createPipe, difference, map, mapToObj, objOf } from 'remeda';
import { complexityForm, renderComplexityFields } from '../common-gear-fields';
import { ItemFormBase } from '../item-form-base';
import styles from './software-form.scss';

const opsGroups = ['effects', 'activatedEffects'] as const;

@customElement('software-form')
export class SoftwareForm extends ItemFormBase {
  static get is() {
    return 'software-form' as const;
  }

  static styles = [entityFormCommonStyles, complexityForm.styles, styles];

  @property({ attribute: false }) item!: Software;

  @internalProperty() effectGroup: 'passive' | 'activated' = 'passive';

  private readonly effectsOps = mapToObj(opsGroups, (group) => [
    group === 'effects' ? 'passive' : 'activated',
    addUpdateRemoveFeature(() => this.item.updater.prop('data', group).commit),
  ]);

  private readonly skillOps = addUpdateRemoveFeature(
    () => this.item.updater.prop('data', 'skills').commit,
  );

  update(changedProps: PropertyValues) {
    if (!this.item.hasActivation) this.effectGroup = 'passive';
    super.update(changedProps);
  }

  private addCreatedEffect(ev: EffectCreatedEvent) {
    this.effectsOps[this.effectGroup].add({}, ev.effect);
  }

  render() {
    const {
      updater,
      type,
      effectGroups,
      hasActivation,
      hasMeshAttacks,
      skills,
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
          fields: ({ softwareType, category, activation, meshAttacks }) => [
            renderSelectField(softwareType, enumValues(SoftwareType)),
            renderTextField(category),
            html`<entity-form-sidebar-divider></entity-form-sidebar-divider>`,
            renderSelectField(
              activation,
              difference(enumValues(ActionType), [ActionType.Task]),
              {
                altLabel: (action) =>
                  `${localize(action)} ${localize('action')}`,
                emptyText: notEmpty(effectGroups.get('activated'))
                  ? undefined
                  : '-',
              },
            ),
            renderNumberField(meshAttacks, { min: 0, max: 2 }),
          ],
        })}

        <div slot="details">
          ${renderUpdaterForm(updater.prop('data'), {
            disabled,
            classes: complexityForm.cssClass,
            fields: renderComplexityFields,
          })}

          <section>
            <sl-header heading=${localize('meshHealth')}>
              <mwc-icon-button
                slot="action"
                data-tooltip=${localize('changes')}
                @mouseover=${tooltip.fromData}
                @focus=${tooltip.fromData}
                icon="change_history"
                @click=${this.setDrawerFromEvent(
                  this.renderHealthChangeHistory,
                  false,
                )}
              ></mwc-icon-button>
            </sl-header>
            <health-item
              clickable
              ?disabled=${this.disabled}
              .health=${this.item.meshHealth}
              @click=${this.setDrawerFromEvent(this.renderMeshHealthEdit)}
            ></health-item>
          </section>

          ${hasMeshAttacks ? this.renderMeshAttacks() : ''}

          <section class=${effectGroups.size === 0 ? "mini" : ""}>
            <sl-header
              heading=${localize('effects')}
              ?hideBorder=${effectGroups.size === 0}
              ><mwc-icon-button
                icon="add"
                slot="action"
                @click=${this.setDrawerFromEvent(this.renderEffectCreator)}
                ?disabled=${disabled}
              ></mwc-icon-button
            ></sl-header>
            ${[...effectGroups].map(([key, group]) =>
              notEmpty(group)
                ? html`
                    <item-form-effects-list
                      label=${ifDefined(
                        hasActivation ? localize(key) : undefined,
                      )}
                      .effects=${group}
                      .operations=${this.effectsOps[key]}
                      ?disabled=${disabled}
                    ></item-form-effects-list>
                  `
                : '',
            )}
          </section>

          <section class=${skills.length === 0 ? "mini" : ""}>
            <sl-header
              heading=${localize('skills')}
              ?hideBorder=${skills.length === 0}
            >
              <mwc-icon-button
                icon="add"
                slot="action"
                @click=${this.setDrawerFromEvent(this.renderSkillCreator)}
                ?disabled=${disabled}
              ></mwc-icon-button>
            </sl-header>

           ${notEmpty(skills) ? html` <sl-animated-list class="skills">
              ${repeat(
                skills,
                idProp,
                (skill, index) => html`
                  <li ?data-comma=${index < skills.length - 1}>
                    <sl-popover
                      .renderOnDemand=${() => html`
                        <sl-popover-section
                          heading="${localize('edit')} ${localize('skill')}"
                        >
                          <delete-button
                            slot="action"
                            @delete=${this.skillOps.removeCallback(skill.id)}
                          ></delete-button>
                          ${renderSubmitForm({
                            props: skill,
                            update: this.skillOps.update,
                            fields: ({ name, specialization, total }) => [
                              renderTextField(name, { required: true }),
                              renderTextField(specialization),
                              renderNumberField(total, { min: 1, max: 99 }),
                            ],
                          })}
                        </sl-popover-section>
                      `}
                    >
                      <button slot="base" ?disabled=${disabled}>
                        <span class="skill-name"
                          >${skill.name}${skill.specialization
                            ? ` (${skill.specialization})`
                            : ''}:</span
                        ><span class="skill-total">${skill.total}</span>
                      </button>
                    </sl-popover>
                  </li>
                `,
              )}
            </sl-animated-list>` : ""}
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

  private renderSkillCreator() {
    return html`
      <h3>${localize('add')} ${localize('skill')}</h3>
      ${renderSubmitForm({
        props: {
          name: '',
          specialization: '',
          total: 1,
        },
        update: this.skillOps.add,
        fields: ({ name, specialization, total }) => [
          renderTextField(name, { required: true }),
          renderTextField(specialization),
          renderNumberField(total, { min: 1, max: 99 }),
        ],
      })}
    `;
  }

  private renderMeshAttacks() {
    const { primary, secondary } = this.item.attacks;
    return html`
      ${this.renderAttack(primary, WeaponAttackType.Primary)}
      ${secondary
        ? this.renderAttack(secondary, WeaponAttackType.Secondary)
        : ''}
    `;
  }

  private renderHealthChangeHistory() {
    const { meshHealth } = this.item;
    return html`
      <section class="history">
        <h3>${localize('history')}</h3>
        <health-log
          .health=${meshHealth}
          ?disabled=${this.disabled}
        ></health-log>
      </section>
    `;
  }

  private renderMeshHealthEdit() {
    const { meshHealth, updater } = this.item;
    return html`
      <h3>${localize('meshHealth')}</h3>
      ${renderUpdaterForm(updater.prop('data', 'meshHealth'), {
        fields: ({ baseDurability }) =>
          renderNumberField(baseDurability, { min: 1 }),
      })}
      <health-state-form .health=${meshHealth}></health-state-form>
    `;
  }

  private renderEffectCreator() {
    return html`
      <h3>${localize('add')} ${localize('effect')}</h3>
      ${this.item.hasActivation
        ? renderAutoForm({
            props: { group: this.effectGroup },
            update: ({ group }) => group && (this.effectGroup = group),
            fields: ({ group }) =>
              renderRadioFields(group, ['passive', 'activated']),
          })
        : ''}

      <effect-creator
        .effectTypes=${enumValues(EffectType)}
        @effect-created=${this.addCreatedEffect}
      ></effect-creator>
    `;
  }

  private renderAttack(attack: SoftwareAttack, type: WeaponAttackType) {
    return html`
      <section>
        <sl-header heading=${attack.label || localize('attack')}>
          <mwc-icon-button
            icon="check"
            slot="action"
            ?disabled=${this.disabled}
            @click=${this.setDrawerFromEvent(
              this[`render${capitalize(type)}CheckEdit` as const],
            )}
          ></mwc-icon-button>
          <mwc-icon-button
            icon="edit"
            slot="action"
            ?disabled=${this.disabled}
            @click=${this.setDrawerFromEvent(
              this[`render${capitalize(type)}Edit` as const],
            )}
          ></mwc-icon-button>
        </sl-header>
        <div class="attack-details">
          <sl-group label=${formatDamageType(attack.damageType)}>
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
          ${this.renderAptitudeCheck(type)}
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

  private renderAptitudeCheck(type: WeaponAttackType) {
    const { aptitudeCheckInfo } = this.item.epData[type];
    const results = enumValues(CheckResultState).flatMap((state) => {
      const list = aptitudeCheckInfo[state];
      return notEmpty(list)
        ? html`
            <sl-group label="${localize('on')} ${localize(state)}">
              ${list.map(formatCheckResultInfo).join('. ')}
            </sl-group>
          `
        : [];
    });

    return notEmpty(results) && aptitudeCheckInfo.check
      ? html`
          <sl-group label=${localize('aptitudeCheck')}
            >${formatAptitudeCheckInfo(aptitudeCheckInfo)}</sl-group
          >
          ${results}
        `
      : '';
  }

  private renderPrimaryAttackEdit() {
    return this.renderAttackEdit(WeaponAttackType.Primary);
  }

  private renderSecondaryAttackEdit() {
    return this.renderAttackEdit(WeaponAttackType.Secondary);
  }

  private renderAttackEdit(type: WeaponAttackType) {
    const updater = this.item.updater.prop('data', type);
    const hasSecondaryAttack = !!this.item.attacks.secondary;

    const [pairedTraits, change] = pairList(
      updater.originalValue().attackTraits,
      enumValues(AttackTrait),
    );
    return html`
      <h3>${localize(hasSecondaryAttack ? type : 'attack')}</h3>

      ${renderUpdaterForm(updater, {
        fields: ({
          damageFormula,
          damageType,
          useMeshArmor,
          armorPiercing,
          reduceAVbyDV,
          label,
        }) => [
          hasSecondaryAttack
            ? renderTextField(label, { placeholder: localize(type) })
            : '',
          renderSelectField(damageType, enumValues(HealthType)),
          renderFormulaField(damageFormula),
          renderLabeledCheckbox(useMeshArmor),
          useMeshArmor.value
            ? map([armorPiercing, reduceAVbyDV], renderLabeledCheckbox)
            : '',
        ],
      })}
      <p class="label">${localize('attackTraits')}</p>
      ${renderAutoForm({
        props: pairedTraits,
        update: createPipe(change, objOf('attackTraits'), updater.commit),
        fields: (traits) => map(Object.values(traits), renderLabeledCheckbox),
      })}
      ${renderUpdaterForm(updater, {
        fields: ({ notes }) => renderTextareaField(notes),
      })}
    `;
  }

  private renderPrimaryAttackCheckEdit() {
    return this.renderAttackCheckEdit(WeaponAttackType.Primary);
  }

  private renderSecondaryAttackCheckEdit() {
    return this.renderAttackCheckEdit(WeaponAttackType.Secondary);
  }

  private renderAttackCheckEdit(type: WeaponAttackType) {
    const updater = this.item.updater.prop('data', type, 'aptitudeCheckInfo');
    const hasSecondaryAttack = !!this.item.attacks.secondary;

    return html`
      <h3>${localize(hasSecondaryAttack ? type : 'attack')}</h3>
      <aptitude-check-info-editor
        .aptitudeCheckInfo=${updater.originalValue()}
        @aptitude-check-info-update=${(ev: AptitudeCheckInfoUpdateEvent) => {
          updater.commit(ev.changed);
        }}
      ></aptitude-check-info-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'software-form': SoftwareForm;
  }
}
