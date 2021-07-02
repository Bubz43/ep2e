import {
  formatArmorUsed,
  formatLabeledFormulas,
} from '@src/combat/attack-formatting';
import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberField,
  renderNumberInput,
  renderRadioFields,
  renderSelectField,
  renderTextareaField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import {
  AptitudeType,
  AttackTrait,
  enumValues,
  SleightDuration,
  SleightType,
  WeaponSkillOption,
} from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import { ActionType } from '@src/features/actions';
import type { EffectCreatedEvent } from '@src/features/components/effect-creator/effect-created-event';
import { EffectType } from '@src/features/effects';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { FieldSkillType, SkillType } from '@src/features/skills';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { formatDamageType, HealthType } from '@src/health/health';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  property,
  PropertyValues,
  state,
} from 'lit-element';
import { map, mapToObj } from 'remeda';
import { ItemFormBase } from '../item-form-base';
import styles from './sleight-form.scss';

const effectGroups = ['self', 'target'] as const;

type EffectGroup = typeof effectGroups[number];

@customElement('sleight-form')
export class SleightForm extends ItemFormBase {
  static get is() {
    return 'sleight-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) item!: Sleight;

  @state() private effectGroup: EffectGroup = 'self';

  @state() private skillOption = WeaponSkillOption.None;

  connectedCallback() {
    this.skillOption = this.item.exoticSkillName
      ? WeaponSkillOption.Exotic
      : WeaponSkillOption.None;
    super.connectedCallback();
  }

  update(changedProps: PropertyValues<this>) {
    if (this.item.isChi) this.effectGroup = 'self';
    else if (this.item.duration !== SleightDuration.Sustained)
      this.effectGroup = 'target';

    super.update(changedProps);
  }

  private readonly effectsOps = mapToObj(effectGroups, (group) => [
    group,
    addUpdateRemoveFeature(
      () =>
        this.item.updater.path('data', `effectsTo${capitalize(group)}` as const)
          .commit,
    ),
  ]);

  private addCreatedEffect(ev: EffectCreatedEvent) {
    this.effectsOps[this.effectGroup].add({}, ev.effect);
  }

  render() {
    const {
      updater,
      type,
      isChi,
      effectsToSelf,
      effectsToTarget,
      duration,
      mentalArmor,
    } = this.item;
    const { disabled } = this;
    const hasStaticDuration =
      duration === SleightDuration.Instant ||
      duration === SleightDuration.Sustained;

    const canHaveSelfEffects = isChi || duration === SleightDuration.Sustained;
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

        ${renderUpdaterForm(updater.path('data'), {
          disabled,
          slot: 'sidebar',
          fields: ({
            sleightType,
            duration,
            action,
            infectionMod,
            timeframe,
          }) => [
            renderSelectField(sleightType, enumValues(SleightType)),
            sleightType.value === SleightType.Chi
              ? ''
              : [
                  renderSelectField(action, enumValues(ActionType)),
                  action.value === ActionType.Task
                    ? renderTimeField(timeframe, { min: 0 })
                    : '',
                  renderSelectField(duration, enumValues(SleightDuration), {
                    helpPersistent: !hasStaticDuration,
                    helpText: hasStaticDuration
                      ? undefined
                      : `${localize(AptitudeType.Willpower)}  ÷ 5`,
                  }),

                  sleightType.value === SleightType.Epsilon
                    ? ''
                    : renderNumberField(infectionMod, { min: 0, max: 100 }),
                ],
          ],
        })}
        ${isChi
          ? ''
          : html`
              <entity-form-sidebar-divider
                slot="sidebar"
              ></entity-form-sidebar-divider>
              ${renderAutoForm({
                slot: 'sidebar',
                props: {
                  skill: this.skillOption,
                },
                update: ({ skill }) => {
                  this.skillOption = skill || WeaponSkillOption.None;
                  if (this.skillOption === WeaponSkillOption.None) {
                    this.item.updater
                      .path('flags', EP.Name, 'exoticSkill')
                      .commit('');
                  } else if (!this.item.exoticSkillName) {
                    this.item.updater
                      .path('flags', EP.Name, 'exoticSkill')
                      .commit(this.item.name);
                  }
                },
                fields: ({ skill }) =>
                  renderSelectField(skill, enumValues(WeaponSkillOption), {
                    altLabel: (value) =>
                      value === WeaponSkillOption.Exotic
                        ? localize(FieldSkillType.Exotic)
                        : localize(SkillType.Psi),
                  }),
              })}
              ${this.skillOption === WeaponSkillOption.Exotic
                ? renderAutoForm({
                    slot: 'sidebar',

                    props: { field: this.item.exoticSkillName || '' },
                    update: ({ field }) =>
                      this.item.updater
                        .path('flags', EP.Name, 'exoticSkill')
                        .commit(field),
                    fields: ({ field }) =>
                      renderTextField(field, { required: true }),
                  })
                : ''}
            `}
        <div slot="details">
          <section>
            <sl-header heading=${localize('effects')}>
              <mwc-icon-button
                icon="add"
                slot="action"
                @click=${this.setDrawerFromEvent(this.renderEffectCreator)}
                ?disabled=${disabled}
              ></mwc-icon-button
            ></sl-header>
            ${canHaveSelfEffects
              ? html`<item-form-effects-list
                  .effects=${effectsToSelf}
                  .operations=${this.effectsOps.self}
                  label=${isChi
                    ? ''
                    : `${localize('to')} ${localize('self')} (${localize(
                        'whileSustaining',
                      )})`}
                  ?disabled=${disabled}
                ></item-form-effects-list>`
              : ''}
            ${isChi
              ? ''
              : html` <item-form-effects-list
                  .effects=${effectsToTarget}
                  .operations=${this.effectsOps.target}
                  label=${canHaveSelfEffects
                    ? `${localize('to')} ${localize('target')}`
                    : ''}
                  ?disabled=${disabled}
                ></item-form-effects-list>`}
            ${renderUpdaterForm(updater.path('data', 'mentalArmor'), {
              classes: 'mental-armor-form',
              fields: ({ apply, divisor, formula }) => [
                renderLabeledCheckbox({
                  ...apply,
                  label: `${localize('apply')} ${localize('mentalArmor')} ${
                    isChi ? '' : localize('toTarget')
                  }`,
                }),
                apply.value
                  ? isChi
                    ? html`<mwc-formfield
                        alignEnd
                        label="@${localize('wil')} / "
                        >${renderNumberInput(divisor, {
                          min: 1,
                        })}</mwc-formfield
                      >`
                    : renderFormulaField(formula)
                  : '',
              ],
            })}
            ${isChi || (!effectsToTarget.length && !mentalArmor.apply)
              ? ''
              : renderUpdaterForm(updater.path('data'), {
                  fields: ({ scaleEffectsOnSuperior }) => [
                    renderLabeledCheckbox({
                      ...scaleEffectsOnSuperior,
                      label: `${localize('scaleToTargetEffectsOnSuperior')}`,
                    }),
                  ],
                })}
          </section>
          ${isChi ? '' : [this.renderAttack(), this.renderHeal()]}
        </div>

        <editor-wrapper
          slot="description"
          ?disabled=${disabled}
          .updateActions=${updater.path('data', 'description')}
        ></editor-wrapper>
        ${this.renderDrawerContent()}
      </entity-form-layout>
    `;
  }

  private renderEffectCreator() {
    return html`
      <h3>${localize('add')} ${localize('effect')}</h3>

      ${this.item.isChi || this.item.duration !== SleightDuration.Sustained
        ? ''
        : html`
            ${renderAutoForm({
              props: { group: this.effectGroup },
              update: ({ group }) => group && (this.effectGroup = group),
              fields: ({ group }) => renderRadioFields(group, effectGroups),
            })}
          `}

      <effect-creator
        .effectTypes=${enumValues(EffectType)}
        @effect-created=${this.addCreatedEffect}
      ></effect-creator>
    `;
  }

  private renderAttack() {
    const { attack } = this.item;
    return html`
      <section>
        <sl-header heading=${localize('attack')}>
          <mwc-icon-button
            icon="edit"
            slot="action"
            ?disabled=${this.disabled}
            @click=${this.setDrawerFromEvent(this.renderAttackEdit)}
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
    const updater = this.item.updater.path('data', 'attack');
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
        fields: ({ damageFormula, useMentalArmor, damageType }) => [
          renderFormulaField(damageFormula),
          renderSelectField(damageType, enumValues(HealthType)),
          renderLabeledCheckbox(useMentalArmor, {
            disabled: !damageFormula.value,
            indeterminate: !damageFormula.value,
          }),
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
      <!-- ${renderUpdaterForm(updater, {
        disabled,
        fields: ({ notes }) => [renderTextareaField(notes)],
      })} -->
    `;
  }

  private renderHeal() {
    const { heal } = this.item.epData;
    return html`
      <section>
        <sl-header heading=${localize('heal')}>
          <mwc-icon-button
            icon="edit"
            slot="action"
            ?disabled=${this.disabled}
            @click=${this.setDrawerFromEvent(this.renderHealEdit)}
          ></mwc-icon-button>
        </sl-header>
        <div class="heal-details">
          <sl-group label=${formatDamageType(heal.healthType)}>
            ${heal.formula || '-'}
          </sl-group>
        </div>
      </section>
    `;
  }

  private renderHealEdit() {
    const updater = this.item.updater.path('data', 'heal');
    const { disabled } = this;

    return html`
      <h3>${localize('attack')}</h3>
      ${renderUpdaterForm(updater, {
        disabled,
        fields: ({ formula, healthType }) => [
          renderFormulaField(formula),
          renderSelectField(healthType, enumValues(HealthType)),
        ],
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sleight-form': SleightForm;
  }
}
