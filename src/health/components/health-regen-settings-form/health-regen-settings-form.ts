import {
  renderFormulaField, renderTimeField
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import type { UpdateStore } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import type { Health } from '@src/health/health-mixin';
import {
  DotOrHotTarget,
  HealsOverTime
} from '@src/health/recovery';
import { customElement, html, LitElement, property } from 'lit-element';
import styles from './health-regen-settings-form.scss';

@customElement('health-regen-settings-form')
export class HealthRegenSettingsForm extends LitElement {
  static get is() {
    return 'health-regen-settings-form' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) health!: Health;

  @property({ attribute: false }) regenUpdater!: UpdateStore<HealsOverTime>;

  render() {
    return html`
      ${enumValues(DotOrHotTarget).map((target) =>
        renderUpdaterForm(this.regenUpdater.prop(target), {
          fields: ({ amount, interval }) => html`
            <p>${localize(target)}</p>
            ${[
              renderTimeField(interval),
              interval.value ? renderFormulaField(amount) : '',
            ]}
          `,
        }),
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-regen-settings-form': HealthRegenSettingsForm;
  }
}
