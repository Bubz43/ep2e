import type { ExplosiveSettings } from '@src/chat/message-data';
import {
  renderRadioFields,
  renderSelectField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues, ExplosiveTrigger } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import { CommonInterval } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
} from 'lit-element';
import { requestCharacter } from '../../../character-request-event';
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

  @property({ attribute: false }) explosive!: Explosive;

  @property({ type: Boolean }) requireSubmit = false;

  @internalProperty() private settings: ExplosiveSettings = this
    .defaultSettings;

  update(changedProps: PropertyValues) {
    if (changedProps.get('explosive') !== undefined)
      this.settings = this.defaultSettings;
    super.update(changedProps);
  }

  private get defaultSettings(): ExplosiveSettings {
    return {
      trigger: ExplosiveTrigger.Impact,
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

  private getToken() {
    return this.token ?? requestCharacter(this)?.token
  }

  render() {
    const { hasSecondaryMode } = this.explosive;
    const { attack } = this;
    // TODO alter aoe
    return html`
      <div class="template">// TODO add/update/delete template</div>
      ${renderAutoForm({
        props: this.formProps,
        update: (changed) => {
          this.settings = { ...this.settings, ...changed };
          if (!this.requireSubmit) this.emitSettings();
        },
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
}

declare global {
  interface HTMLElementTagNameMap {
    'explosive-settings-form': ExplosiveSettingsForm;
  }
}
