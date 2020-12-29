import type { ExplosiveSettings } from '@src/chat/message-data';
import { formatAreaEffect } from '@src/combat/attack-formatting';
import {
  renderNumberField,
  renderRadioFields,
  renderSelectField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { AreaEffectType, enumValues, ExplosiveTrigger } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import { CommonInterval } from '@src/features/time';
import {
  readyCanvas,
  placeMeasuredTemplate,
  createTemporaryMeasuredTemplate,
  getVisibleTokensWithinHighlightedTemplate,
} from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { userCan } from '@src/foundry/misc-helpers';
import { averageRoll, rollLimit } from '@src/foundry/rolls';
import { nonNegative } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { clamp, identity } from 'remeda';
import styles from './explosive-settings-form.scss';

@customElement('explosive-settings-form')
export class ExplosiveSettingsForm extends LitElement {
  static get is() {
    return 'explosive-settings-form' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) token?: MaybeToken;

  @property({ attribute: false }) character?: Character | null;

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
      trigger: ExplosiveTrigger.Impact,
      ...(this.initialSettings ?? {}),
    };
  }

  private get formProps() {
    const {
      trigger,
      timerDuration = CommonInterval.Turn,
      duration = 0,
      attackType = 'primary',
    } = this.settings;
    return { trigger, timerDuration, duration, attackType };
  }

  get attack() {
    const { primary, secondary } = this.explosive.attacks;
    return this.settings.attackType === 'secondary' && secondary
      ? secondary
      : primary;
  }

  private emitSettings() {
    this.dispatchEvent(
      new CustomEvent('explosive-settings', {
        bubbles: true,
        composed: true,
        detail: this.settings,
      }),
    );
  }

  private updateSettings = (changed: Partial<ExplosiveSettings>) => {
    this.settings = { ...this.settings, ...changed };
    if (!this.requireSubmit) this.emitSettings();
  };

  private getToken() {
    return this.token || this.character?.actor.getActiveTokens(true)[0];
  }

  private get explosiveDistances() {
    return {
      uniform:
        this.settings.uniformBlastRadius || this.explosive.areaEffectRadius,
      centered: this.settings.centeredReduction || 2,
    };
  }

  private get averageDamage() {
    return this.attack.rollFormulas.reduce((accum, { formula }) => accum + averageRoll(formula), 0);
   
  }

  private async setTemplate() {
    const token = this.getToken();
    const center =
      token && token?.scene === readyCanvas()?.scene
        ? token.center
        : { x: 0, y: 0 };
    const data =
      this.explosive.areaEffect === AreaEffectType.Uniform
        ? {
            t: 'circle',
            distance: this.explosiveDistances.uniform,
          } as const
        : {
            t: 'circle',
            distance: clamp(
              nonNegative(this.averageDamage) / this.explosiveDistances.centered,
              { min: 1 },
            ),
          } as const;
    const ids = await placeMeasuredTemplate(
      createTemporaryMeasuredTemplate({
        ...center,
        ...data
      }),
      !!token,
    );
    if (ids) {
      this.updateSettings({ template: ids });
      this.getTargets();
    }
  }

  private async removeTemplate() {
    if (this.settings.template) {
      const { sceneId, templateId } = this.settings.template;
      await game.scenes
        .get(sceneId)
        ?.deleteEmbeddedEntity(MeasuredTemplate.embeddedName, templateId);
      this.targets.clear();
      this.updateSettings({ template: null });
    }
  }

  private editTemplate() {
    if (this.settings.template) {
      readyCanvas()
        ?.templates.get(this.settings.template.templateId)
        ?.sheet.render(true);
    }
  }

  private getTargets() {
    if (this.settings.template) {
      this.targets = getVisibleTokensWithinHighlightedTemplate(
        this.settings.template.templateId,
      );
      this.requestUpdate();
    }
  }

  render() {
    const { hasSecondaryMode, areaEffect } = this.explosive;
    const { attack } = this;
    // TODO plant and hardware: explosives
    // TODO make centered cone
    return html`
      ${areaEffect
        ? html`
            <div class="area-effect">
              <span class="label">${localize('areaEffect')}</span>
              ${formatAreaEffect(this.explosive)}
            </div>
            <div class="area-effect-adjustments">
              <span class="label"
                >${localize('adjust')} (${localize('quick')}
                ${localize('action')})</span
              >
              ${areaEffect === AreaEffectType.Centered
        ? renderAutoForm({
          storeOnInput: true,
          
                    props: {
                      centeredReduction: this.explosiveDistances.centered,
                    },
                    update: this.updateSettings,
                    fields: ({ centeredReduction }) =>
                      renderNumberField(
                        {
                          ...centeredReduction,
                          label: `${localize(
                            'SHORT',
                            'damageValue',
                          )} ${localize('reduction')}/m`,
                        },
                        { min: 2, max: 20 },
                      ),
                  })
                : renderAutoForm({
                  storeOnInput: true,
                    props: {
                      uniformBlastRadius: this.explosiveDistances.uniform,
                    },
                    update: this.updateSettings,
                    fields: ({ uniformBlastRadius }) =>
                      renderNumberField(uniformBlastRadius, {
                        min: 0,
                        max: this.explosive.areaEffectRadius,
                      }),
                  })}
            </div>
            ${userCan('TEMPLATE_CREATE') ? this.renderTemplateEditor() : ''}
          `
        : ''}
      ${renderAutoForm({
        classes: "settings-form",
        props: this.formProps,
        update: this.updateSettings,
        fields: ({ trigger, timerDuration, duration, attackType }) => [
          hasSecondaryMode
            ? renderRadioFields(attackType, ['primary', 'secondary'])
            : '',
          renderSelectField(trigger, enumValues(ExplosiveTrigger)),
          trigger.value === ExplosiveTrigger.Timer
            ? renderTimeField(timerDuration, { min: CommonInterval.Turn })
            : '',
          attack.duration ? renderTimeField(duration) : '',
        ],
      })}
      ${this.requireSubmit
        ? html`
            <submit-button
              complete
              @submit-attempt=${this.emitSettings}
              label=${localize('confirm')}
            ></submit-button>
          `
        : ''}
    `;
  }

  private renderTemplateEditor() {
    const { template } = this.settings;

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
}

declare global {
  interface HTMLElementTagNameMap {
    'explosive-settings-form': ExplosiveSettingsForm;
  }
}
