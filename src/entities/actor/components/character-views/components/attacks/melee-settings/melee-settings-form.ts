import {
  emptyTextDash,
  renderFormulaField,
  renderLabeledCheckbox,
  renderSelectField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import { enumValues } from '@src/data-enums';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import type { MeleeWeaponSettings } from '@src/entities/weapon-settings';
import { localize } from '@src/foundry/localization';
import { SuccessTestResult } from '@src/success-test/success-test';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  PropertyValues,
} from 'lit-element';
import { map } from 'remeda';
import { traverseActiveElements } from 'weightless';
import styles from './melee-settings-form.scss';

@customElement('melee-settings-form')
export class MeleeSettingsForm extends LitElement {
  static get is() {
    return 'melee-settings-form' as const;
  }

  static get styles() {
    return [styles];
  }

  static openWindow(
    props: Pick<
      MeleeSettingsForm,
      'meleeWeapon' | 'requireSubmit' | 'initialSettings' | 'editTestResult'
    > & {
      update: (newSettings: CustomEvent<MeleeWeaponSettings>) => void;
      adjacentEl?: HTMLElement;
    },
  ) {
    const adjacentEl = props.adjacentEl || traverseActiveElements();
    return openWindow({
      key: MeleeSettingsForm,
      name: `${props.meleeWeapon.name} ${localize('settings')}`,
      adjacentEl: adjacentEl instanceof HTMLElement ? adjacentEl : null,
      content: html`
        <melee-settings-form
          .meleeWeapon=${props.meleeWeapon}
          ?requireSubmit=${props.requireSubmit}
          .initialSettings=${props.initialSettings}
          @melee-settings=${(ev: CustomEvent<MeleeWeaponSettings>) => {
            props.update(ev);
            closeWindow(MeleeSettingsForm);
          }}
        ></melee-settings-form>
      `,
    });
  }

  @property({ attribute: false }) meleeWeapon!: MeleeWeapon;

  @property({ type: Boolean }) requireSubmit = false;

  @property({ type: Object }) initialSettings?: Partial<MeleeWeaponSettings>;

  @property({ type: Boolean }) editTestResult = false;

  @internalProperty() private settings: MeleeWeaponSettings = {};

  update(changedProps: PropertyValues) {
    if (
      changedProps.get('meleeWeapon') !== undefined ||
      changedProps.has('initialSettings')
    ) {
      this.settings = { ...(this.initialSettings || {}) };
    }

    super.update(changedProps);
  }

  get attack() {
    const { primary, secondary } = this.meleeWeapon.attacks;
    return this.settings.attackType === 'secondary' && secondary
      ? secondary
      : primary;
  }

  private emitSettings() {
    this.dispatchEvent(
      new CustomEvent('melee-settings', {
        bubbles: true,
        composed: true,
        detail: this.settings,
      }),
    );
  }

  private updateSettings = (changed: Partial<MeleeWeaponSettings>) => {
    this.settings = {
      ...this.settings,
      ...changed,
    };
    if (!this.requireSubmit) this.emitSettings();
  };

  private get formProps() {
    const {
      unarmedDV = '',
      touchOnly = false,
      aggressive = false,
      charging = false,
      extraWeapon = false,
      testResult = SuccessTestResult.Success,
    } = this.settings;
    return {
      unarmedDV,
      touchOnly,
      aggressive,
      charging,
      extraWeapon,
      testResult,
    };
  }

  render() {
    return html`
      ${renderAutoForm({
        props: this.formProps,
        update: this.updateSettings,
        fields: ({
          testResult,
          unarmedDV,
          touchOnly,
          aggressive,
          charging,
          extraWeapon,
        }) => [
          this.editTestResult
            ? renderSelectField(
                testResult,
                enumValues(SuccessTestResult),
                emptyTextDash,
              )
            : '',
          this.meleeWeapon.augmentUnarmed ? renderFormulaField(unarmedDV) : '',
          map(
            [touchOnly, aggressive, charging, extraWeapon],
            renderLabeledCheckbox,
          ),
        ],
      })}
      ${this.requireSubmit
        ? html`
            <submit-button
              label=${localize('save')}
              complete
              @click=${this.emitSettings}
            ></submit-button>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'melee-settings-form': MeleeSettingsForm;
  }
}
