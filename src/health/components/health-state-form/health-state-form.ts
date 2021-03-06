import { renderNumberField } from '@src/components/field/fields';
import { renderAutoForm, renderSubmitForm } from '@src/components/form/forms';
import { localize } from '@src/foundry/localization';
import {
  createHealthModification,
  HealthModificationMode,
} from '@src/health/health';
import type { Health } from '@src/health/health-mixin';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './health-state-form.scss';

@customElement('health-state-form')
export class HealthStateForm extends LitElement {
  static get is() {
    return 'health-state-form' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) health!: Health;

  render() {
    return html`
      ${renderSubmitForm({
        classes: 'health-state',
        props: this.health.data,
        update: ({
          damage = this.health.data.damage,
          wounds = this.health.data.wounds,
        }) =>
          this.health.applyModification(
            createHealthModification({
              mode: HealthModificationMode.Edit,
              damage,
              wounds,
              source: localize('form'),
            }),
          ),
        fields: ({ damage, wounds }) => [
          renderNumberField(
            { ...damage, label: this.health.main.damage.label },
            { min: 0 },
          ),
          this.health.wound
            ? renderNumberField(
                { ...wounds, label: this.health.wound.wounds.label },
                { min: 0 },
              )
            : '',
        ],
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-state-form': HealthStateForm;
  }
}
