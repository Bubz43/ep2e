import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderNumberInput,
  renderRadioFields,
  renderSelectField,
} from '@src/components/field/fields';
import { renderAutoForm, renderUpdaterForm } from '@src/components/form/forms';
import { enumValues, SleightDuration, SleightType } from '@src/data-enums';
import { entityFormCommonStyles } from '@src/entities/components/form-layout/entity-form-common-styles';
import type { Sleight } from '@src/entities/item/proxies/sleight';
import { ActionType } from '@src/features/actions';
import type { EffectCreatedEvent } from '@src/features/components/effect-creator/effect-created-event';
import { EffectType } from '@src/features/effects';
import { addUpdateRemoveFeature } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import {
  customElement,
  html,
  internalProperty,
  property,
  PropertyValues,
} from 'lit-element';
import { mapToObj } from 'remeda';
import { ItemFormBase } from '../item-form-base';
import styles from './sleight-form.scss';

const opsGroups = ['toSelf', 'toTarget'] as const;

@customElement('sleight-form')
export class SleightForm extends ItemFormBase {
  static get is() {
    return 'sleight-form' as const;
  }

  static styles = [entityFormCommonStyles, styles];

  @property({ attribute: false }) item!: Sleight;

  @internalProperty() private effectGroup: typeof opsGroups[number] = 'toSelf';

  private readonly effectsOps = mapToObj(opsGroups, (group) => [
    group,
    addUpdateRemoveFeature(
      () => this.item.updater.path('data', group, 'effects').commit,
    ),
  ]);

  update(changedProps: PropertyValues<this>) {
    if (this.item.isChi) this.effectGroup = 'toSelf';
    super.update(changedProps);
  }

  private addCreatedEffect(ev: EffectCreatedEvent) {
    this.effectsOps[this.effectGroup].add({}, ev.effect);
  }

  render() {
    const {
      updater,
      type,
      isChi,
      effectsOnSelf,
      effectsOnTarget,
      toSelf,
      toTarget,
    } = this.item;
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

        ${renderUpdaterForm(updater.path('data'), {
          disabled,
          slot: 'sidebar',
          fields: ({ sleightType, duration, action }) => [
            renderSelectField(sleightType, enumValues(SleightType)),
            sleightType.value === SleightType.Chi
              ? ''
              : [
                  renderSelectField(duration, enumValues(SleightDuration)),
                  renderSelectField(action, enumValues(ActionType)),
                ],
          ],
        })}

        <div slot="details">
          <section>
            <sl-header
              heading=${isChi
                ? `${localize('passive')} ${localize('effects')}`
                : `${localize('effects')} ${localize('to')} ${localize(
                    'self',
                  )}`}
            >
              <mwc-icon-button
                icon="add"
                slot="action"
                @click=${this.setDrawerFromEvent(this.renderEffectCreator)}
                ?disabled=${disabled}
              ></mwc-icon-button
            ></sl-header>

            ${renderUpdaterForm(updater.path('data', 'toSelf', 'mentalArmor'), {
              classes: 'mental-armor-form',
              fields: ({ apply, divisor, formula }) => [
                renderLabeledCheckbox({
                  ...apply,
                  label: `${localize('apply')} ${localize('mentalArmor')}`,
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

            <item-form-effects-list
              .effects=${effectsOnSelf}
              .operations=${this.effectsOps.toSelf}
              ?disabled=${disabled}
            ></item-form-effects-list>
          </section>
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
      ${this.item.isChi
        ? ''
        : renderAutoForm({
            props: { group: this.effectGroup },
            classes: 'effect-group-form',
            update: ({ group }) => group && (this.effectGroup = group),
            fields: ({ group }) => renderRadioFields(group, opsGroups),
          })}

      <effect-creator
        .effectTypes=${enumValues(EffectType)}
        @effect-created=${this.addCreatedEffect}
      ></effect-creator>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sleight-form': SleightForm;
  }
}
