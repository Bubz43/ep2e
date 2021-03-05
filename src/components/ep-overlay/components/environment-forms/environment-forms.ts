import {
  renderLabeledCheckbox,
  renderNumberField,
  renderSwitch,
  renderTextareaField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm, SlCustomStoreEvent } from '@src/components/form/forms';
import {
  createEnvironment,
  createEnvironmentOverrides,
  Environment,
  subscribeToEnvironmentChange,
} from '@src/features/environment';
import { readyCanvas } from '@src/foundry/canvas';
import { closeImagePicker, openImagePicker } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { gameSettings } from '@src/init';
import type { FieldPropsRenderer } from '@src/utility/field-values';
import { customElement, html, LitElement } from 'lit-element';
import { createPipe, map, merge } from 'remeda';
import styles from './environment-forms.scss';

const renderEnvironmentFields: FieldPropsRenderer<Environment> = ({
  name,
  img,
  gravity,
  vacuum,
  notes,
}) => [
  renderTextField(name, { maxLength: 20 }),
  renderNumberField(gravity, { min: 0, max: 4, step: 0.001 }),
  renderLabeledCheckbox(vacuum),
  renderTextField(img, {
    after: html`
      <button
        @click=${({ currentTarget }: Event) => {
          openImagePicker(renderEnvironmentFields, img.value, (path) => {
            closeImagePicker(renderEnvironmentFields);
            currentTarget?.dispatchEvent(
              new SlCustomStoreEvent({
                key: img.prop,
                value: path,
              }),
            );
          });
        }}
      >
        ${img.value
          ? html` <img src=${img.value} height="25px" /> `
          : html`<mwc-icon>image_search</mwc-icon>`}
      </button>
    `,
  }),
  renderTextareaField({
    ...notes,
    label: `${localize('public')} ${notes.label}`,
  }),
];

@customElement('environment-forms')
export class EnvironmentForms extends LitElement {
  static get is() {
    return 'environment-forms' as const;
  }

  static styles = [styles];

  private environmentUnsub: (() => void) | null = null;

  connectedCallback() {
    super.connectedCallback();
    this.environmentUnsub = subscribeToEnvironmentChange(() =>
      this.requestUpdate(),
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.environmentUnsub?.();
    this.environmentUnsub = null;
  }

  render() {
    const forms = [
      renderAutoForm({
        props: gameSettings.environment.current,
        update: createPipe(merge, gameSettings.environment.update),
        fields: renderEnvironmentFields,
      }),
    ];

    const scene = readyCanvas()?.scene;
    if (scene) {
      const { environment, environmentOverrides } = scene.epFlags || {};
      forms.push(
        renderAutoForm({
          classes: 'environment-toggles',
          props: createEnvironmentOverrides(environmentOverrides || {}),
          update: (changed, existing) =>
            scene.updater
              .path('flags', EP.Name, 'environmentOverrides')
              .commit({ ...existing, ...changed }),
          fields: ({ name, gravity, vacuum, img, notes }) =>
            map([name, gravity, vacuum, img, notes], renderSwitch),
        }),
        renderAutoForm({
          props: createEnvironment(environment || {}),
          update: (changed, existing) =>
            scene.updater
              .path('flags', EP.Name, 'environment')
              .commit({ ...existing, ...changed }),
          fields: renderEnvironmentFields,
        }),
      );
    }

    return html`
      <header class="forms-header">
        <h3>${localize('general')} ${localize('environment')}</h3>
        ${scene
          ? html` <h3>${localize('scene')} ${localize('environment')}</h3> `
          : ''}
      </header>
      <div class="forms">${forms}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'environment-forms': EnvironmentForms;
  }
}
