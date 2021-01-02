import { getCenteredDistance } from '@src/combat/area-effect';
import {
  emptyTextDash,
  renderNumberField,
  renderNumberInput,
  renderRadioFields,
  renderSelectField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import {
  AreaEffectType,
  Demolition,
  enumValues,
  ExplosiveTrigger,
} from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import {
  createDemolitionSetting,
  createExplosiveTriggerSetting,
  DemolitionSetting,
  ExplosiveSettings,
  ExplosiveTriggerSettings,
} from '@src/entities/explosive-settings';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import { CommonInterval, currentWorldTimeMS } from '@src/features/time';
import {
  controlledToken,
  createTemporaryMeasuredTemplate,
  deletePlacedTemplate,
  editPlacedTemplate,
  getVisibleTokensWithinHighlightedTemplate,
  MeasuredTemplateData,
  placeMeasuredTemplate,
  readyCanvas,
  updatePlacedTemplate,
} from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { userCan } from '@src/foundry/misc-helpers';
import { averageRoll } from '@src/foundry/rolls';
import {
  isSuccessfullTestResult,
  SuccessTestResult,
} from '@src/success-test/success-test';
import { nonNegative } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { clamp, difference, identity } from 'remeda';
import type { SetOptional } from 'type-fest';
import { traverseActiveElements } from 'weightless';
import styles from './explosive-settings-form.scss';

@customElement('explosive-settings-form')
export class ExplosiveSettingsForm extends LitElement {
  static get is() {
    return 'explosive-settings-form' as const;
  }

  static get styles() {
    return [styles];
  }

  static openWindow(
    props: Pick<
      ExplosiveSettingsForm,
      'explosive' | 'requireSubmit' | 'initialSettings'
    > & { update: (newSettings: CustomEvent<ExplosiveSettings>) => void },
  ) {
    const adjacentEl = traverseActiveElements();
    return openWindow({
      key: ExplosiveSettingsForm,
      name: `${props.explosive.name} ${localize('settings')}`,
      adjacentEl: adjacentEl instanceof HTMLElement ? adjacentEl : null,
      content: html`
        <explosive-settings-form
          .explosive=${props.explosive}
          ?requireSubmit=${props.requireSubmit}
          .initialSettings=${props.initialSettings}
          @explosive-settings=${(ev: CustomEvent<ExplosiveSettings>) => {
            props.update(ev);
            closeWindow(ExplosiveSettingsForm);
          }}
        ></explosive-settings-form>
      `,
    });
  }

  @property({ attribute: false }) explosive!: Explosive;

  @property({ type: Boolean }) requireSubmit = false;

  @property({ type: Object }) initialSettings?: Partial<ExplosiveSettings>;

  @internalProperty() private settings: ExplosiveSettings = this
    .defaultSettings;

  @internalProperty() private targets = new Set<Token>();

  disconnectedCallback() {
    this.targets.clear();
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues) {
    if (
      changedProps.get('explosive') !== undefined ||
      changedProps.has('initialSettings')
    ) {
      this.settings = this.defaultSettings;
    }

    super.update(changedProps);
  }

  private get defaultSettings(): ExplosiveSettings {
    return {
      trigger: createExplosiveTriggerSetting(
        this.isPlacing ? ExplosiveTrigger.Signal : ExplosiveTrigger.Impact,
      ),
      ...(this.initialSettings ?? {}),
    };
  }

  private get formProps() {
    const { duration = 0, attackType = 'primary' } = this.settings;
    return { duration, attackType };
  }

  get attack() {
    const { primary, secondary } = this.explosive.attacks;
    return this.settings.attackType === 'secondary' && secondary
      ? secondary
      : primary;
  }

  private emitSettings() {
    if ('startTime' in this.settings.trigger) {
      this.settings.trigger.startTime = currentWorldTimeMS();
    }
    this.dispatchEvent(
      new CustomEvent('explosive-settings', {
        bubbles: true,
        composed: true,
        detail: this.settings,
      }),
    );
  }

  private updateSettings = (changed: Partial<ExplosiveSettings>) => {
    this.settings = {
      ...this.settings,
      duration: this.attack.duration,
      ...changed,
    };
    if (!this.requireSubmit) this.emitSettings();
  };

  private get explosiveDistances() {
    return {
      uniform:
        this.settings.uniformBlastRadius || this.explosive.areaEffectRadius,
      centered: this.settings.centeredReduction || -2,
    };
  }

  private get averageDamage() {
    return this.attack.rollFormulas.reduce(
      (accum, { formula }) => accum + averageRoll(formula),
      0,
    );
  }

  private get templateData(): SetOptional<
    Pick<MeasuredTemplateData, 't' | 'distance' | 'angle'>,
    'angle'
  > {
    const { areaEffect } = this.explosive;
    if (areaEffect === AreaEffectType.Centered) {
      const distance = getCenteredDistance(
        this.averageDamage,
        this.explosiveDistances.centered,
      );
      // const distance = clamp(
      //   nonNegative(this.averageDamage) /
      //     Math.abs(this.explosiveDistances.centered),
      //   { min: 1 },
      // );
      return this.settings.demolition?.type === Demolition.ShapeCentered
        ? {
            t: 'cone',
            distance,
            angle: this.settings.demolition.angle,
          }
        : {
            t: 'circle',
            distance,
          };
    }
    return {
      t: 'circle',
      distance: this.explosiveDistances.uniform,
    };
  }

  private async setTemplate() {
    const token = controlledToken();
    const center = token?.center ??
      readyCanvas()?.scene._viewPosition ?? { x: 0, y: 0 };

    const ids = await placeMeasuredTemplate(
      createTemporaryMeasuredTemplate({
        ...center,
        ...this.templateData,
      }),
      !!token,
    );
    if (ids) {
      this.updateSettings({ templateIDs: ids });
      this.getTargets();
    }
  }

  private async removeTemplate() {
    await deletePlacedTemplate(this.settings.templateIDs);
    this.targets.clear();
    this.updateSettings({ templateIDs: null });
  }

  private editTemplate() {
    editPlacedTemplate(this.settings.templateIDs);
  }

  private getTargets() {
    if (this.settings.templateIDs) {
      this.targets = getVisibleTokensWithinHighlightedTemplate(
        this.settings.templateIDs.templateId,
      );
      this.requestUpdate();
    }
  }

  private get isPlacing() {
    return !!this.initialSettings?.placing;
  }

  private get triggerOptions() {
    const options = enumValues(ExplosiveTrigger);
    return this.isPlacing
      ? difference(options, [
          ExplosiveTrigger.Airburst,
          ExplosiveTrigger.Impact,
        ])
      : options;
  }

  private get demolitionOptions() {
    const options = enumValues(Demolition);
    return this.explosive.areaEffect === AreaEffectType.Centered
      ? options
      : difference(options, [Demolition.ShapeCentered]);
  }

  private setDemolitionOption(option: Demolition | undefined | '') {
    option
      ? this.updateDemolitionSetting({}, createDemolitionSetting(option))
      : this.updateSettings({ demolition: null });
  }

  private updateDemolitionSetting = <T extends DemolitionSetting>(
    changed: Partial<T>,
    original: T,
  ) => {
    this.updateSettings({ demolition: { ...original, ...changed } });
    const { templateIDs: template, demolition } = this.settings;
    if (template && demolition?.type === Demolition.ShapeCentered) {
      updatePlacedTemplate(template, { t: 'cone', angle: demolition.angle });
    }
  };

  private setTriggerOption(option: ExplosiveTrigger) {
    this.updateSettings({ trigger: createExplosiveTriggerSetting(option) });
  }

  private updateTriggerSettings = <T extends ExplosiveTriggerSettings>(
    changed: Partial<T>,
    original: T,
  ) => {
    this.updateSettings({ trigger: { ...original, ...changed } });
  };

  private get demolitionType() {
    return this.settings.demolition?.type || '';
  }

  render() {
    const { areaEffect } = this.explosive;
    return html`
      ${this.isPlacing
        ? html` <h2>${localize('place')} ${localize('explosive')}</h2> `
        : ''}
      ${areaEffect ? this.renderAreaEffect(areaEffect) : ''}
      ${this.isPlacing
        ? html`<section class="demolition">
            ${renderAutoForm({
              noDebounce: this.requireSubmit,
              props: { demolition: this.demolitionType } as const,
              update: ({ demolition }) => this.setDemolitionOption(demolition),
              fields: ({ demolition }) =>
                renderSelectField(
                  {
                    ...demolition,
                    label: `${demolition.label} ${localize('settings')}`,
                  },
                  this.demolitionOptions,
                  emptyTextDash,
                ),
            })}
            ${this.settings.demolition
              ? this.renderDemolitionForm(this.settings.demolition)
              : ''}
          </section> `
        : ''}
      ${areaEffect && userCan('TEMPLATE_CREATE')
        ? this.renderTemplateEditor()
        : ''}
      ${this.renderCommonSettings()}
    `;
  }

  private renderAreaEffect(areaEffect: AreaEffectType) {
    return html`<section class="area-effect">
      <span
        >${localize(areaEffect)} ${localize('areaEffect')}
        ${areaEffect === AreaEffectType.Centered
          ? renderAutoForm({
              storeOnInput: true,

              props: {
                centeredReduction: this.explosiveDistances.centered,
              },
              update: this.updateSettings,
              fields: ({ centeredReduction }) =>
                html`${renderNumberInput(centeredReduction, {
                  max: -2,
                  min: -20,
                })}
                DV/m`,
            })
          : renderAutoForm({
              storeOnInput: true,
              props: {
                uniformBlastRadius: this.explosiveDistances.uniform,
              },
              update: this.updateSettings,
              fields: ({ uniformBlastRadius }) =>
                html`${renderNumberInput(uniformBlastRadius, {
                  min: 1,
                  max: this.explosive.areaEffectRadius,
                })}
                ${localize('meter')} ${localize('radius')}`,
            })}
      </span>
      <p>
        ${localize('quick')} ${localize('action')} ${localize('to')}
        ${localize('adjust')}
      </p>
    </section> `;
  }

  private renderDemolitionForm(setting: DemolitionSetting) {
    switch (setting.type) {
      case Demolition.DamageAgainsStructures:
        return renderAutoForm({
          props: setting,
          update: this.updateDemolitionSetting,
          fields: ({ testResult }) =>
            renderSelectField(
              testResult,
              enumValues(SuccessTestResult).filter(isSuccessfullTestResult),
            ),
        });

      case Demolition.DisarmDifficulty:
        return renderAutoForm({
          props: setting,
          update: this.updateDemolitionSetting,
          fields: ({ testResult, roll }) => [
            renderNumberField(roll, { min: 0, max: 99 }),
            renderSelectField(
              testResult,
              enumValues(SuccessTestResult).filter(isSuccessfullTestResult),
            ),
          ],
        });

      case Demolition.ShapeCentered:
        return renderAutoForm({
          storeOnInput: true,
          props: setting,
          update: this.updateDemolitionSetting,
          fields: ({ angle }) => [
            renderNumberField(
              { ...angle, label: `${angle.label} (${localize('degrees')})` },
              { min: 1, max: 359 },
            ),
          ],
        });
      case Demolition.StructuralWeakpoint:
        return html``;
    }
  }

  private renderTemplateEditor() {
    const { templateIDs: template } = this.settings;

    return html` <div class="template">
        <div>${localize('template')}</div>
        ${template
          ? html`
              ${readyCanvas()?.scene.id === template.sceneId
                ? html`
                    <mwc-button
                      dense
                      label=${localize('edit')}
                      icon="edit"
                      @click=${this.editTemplate}
                    ></mwc-button>
                  `
                : ''}

              <mwc-button
                dense
                @click=${this.removeTemplate}
                label=${localize('remove')}
                icon="clear"
              ></mwc-button>
            `
          : html`
              <mwc-button
                dense
                @click=${this.setTemplate}
                label=${localize('place')}
                icon="place"
              ></mwc-button>
            `}
      </div>
      <div class="targets">
        <div>${localize('visible')} ${localize('targets')}</div>
        ${template
          ? html`<mwc-icon-button
              icon="refresh"
              @click=${this.getTargets}
            ></mwc-icon-button>`
          : ''}
        <sl-animated-list>
          ${repeat(
            this.targets,
            identity,
            (target) => html` <img src=${target.data.img} height="32px" /> `,
          )}
        </sl-animated-list>
      </div>`;
  }

  private renderCommonSettings() {
    const { hasSecondaryMode, areaEffect } = this.explosive;
    const { attack } = this;
    return html`${renderAutoForm({
        classes: 'settings-form',
        props: this.formProps,
        update: this.updateSettings,
        fields: ({ duration, attackType }) => [
          hasSecondaryMode
            ? renderRadioFields(attackType, ['primary', 'secondary'], {
                altLabel: (key) =>
                  this.explosive.attacks[key]?.label || localize(key),
              })
            : '',
          // attack.duration ? renderTimeField(duration) : '',
        ],
      })}
      <div class="trigger-settings">
        ${renderAutoForm({
          noDebounce: this.requireSubmit,
          props: this.settings.trigger,
          update: ({ type }) => type && this.setTriggerOption(type),
          fields: ({ type }) =>
            renderSelectField(
              { ...type, label: localize('trigger') },
              this.triggerOptions,
            ),
        })}
        ${this.renderTriggerForm(this.settings.trigger)}
      </div>
      ${this.requireSubmit
        ? html`
            <submit-button
              complete
              @submit-attempt=${this.emitSettings}
              label=${localize('confirm')}
            ></submit-button>
          `
        : ''}`;
  }

  private renderTriggerForm(settings: ExplosiveTriggerSettings) {
    switch (settings.type) {
      case ExplosiveTrigger.Impact:
      case ExplosiveTrigger.Signal:
        return '';

      case ExplosiveTrigger.Airburst:
        return renderAutoForm({
          props: settings,
          update: this.updateTriggerSettings,
          fields: ({ distance }) => renderNumberField(distance, { min: 1 }), // TODO max?
        });

      case ExplosiveTrigger.Proximity:
        return renderAutoForm({
          props: settings,
          update: this.updateTriggerSettings,
          fields: ({ radius, targets }) => [
            renderNumberField(
              { ...radius, label: `${radius.label} (${localize('meters')})` },
              { min: 0.1, max: 3 },
            ),
            renderSelectField(
              targets,
              [ActorType.Biological, ActorType.Synthetic],
              { emptyText: localize('any') },
            ),
          ],
        });

      case ExplosiveTrigger.Timer:
        return renderAutoForm({
          props: settings,
          update: this.updateTriggerSettings,
          fields: ({ detonationPeriod }) =>
            renderTimeField(detonationPeriod, { min: CommonInterval.Turn }),
        });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'explosive-settings-form': ExplosiveSettingsForm;
  }
}
