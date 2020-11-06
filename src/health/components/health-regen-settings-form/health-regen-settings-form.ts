import {
  renderTimeField,
  renderFormulaField,
} from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import type { UpdateActions, UpdateStore } from '@src/entities/update-store';
import { localize } from '@src/foundry/localization';
import type { Health } from '@src/health/health-mixin';
import {
  DotOrHotTarget,
  HealsOverTime,
  HealthTick,
} from '@src/health/recovery';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './health-regen-settings-form.scss';

@customElement('health-regen-settings-form')
export class HealthRegenSettingsForm extends LitElement {
  static get is() {
    return 'health-regen-settings-form' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) health!: Health;

  @property({ attribute: false }) regenUpdater!: UpdateStore<{
    hot: HealsOverTime;
  }>;

  render() {
    return html`
      ${enumValues(DotOrHotTarget).map((target) =>
        renderUpdaterForm(this.regenUpdater.prop('hot', target), {
          fields: ({ amount, interval }) => html`
            <p>${localize(target)} ${localize('repair')}</p>
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
