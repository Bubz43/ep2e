import {
  renderFormulaField,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import { customElement, html, internalProperty, LitElement } from 'lit-element';
import styles from './custom-roll-app.scss';

const createInitialState = () => ({
  source: localize('custom'),
  formula: '1d6',
  damageType: HealthType.Physical,
});

@customElement('custom-roll-app')
export class CustomRollApp extends LitElement {
  static get is() {
    return 'custom-roll-app' as const;
  }

  static get styles() {
    return [styles];
  }

  @internalProperty() private attackData = createInitialState();

  private rollAttack() {
    const { source, formula, damageType } = this.attackData;
    window.ep2e.rollCustomAttack({
      source,
      formulas: [{ label: localize('base'), formula }],
      damageType,
    });
  }

  private reset() {
    this.attackData = createInitialState();
  }

  render() {
    return html`
      ${renderAutoForm({
        props: this.attackData,
        update: (changes) => {
          this.attackData = { ...this.attackData, ...changes };
        },
        fields: ({ source, formula, damageType }) => [
          renderTextField(source),
          renderFormulaField(formula),
          renderSelectField(damageType, enumValues(HealthType)),
        ],
      })}

      <div class="actions">
        <mwc-button @click=${this.reset}>${localize('reset')}</mwc-button>

        <mwc-button raised @click=${this.rollAttack} class="roll-attack"
          >${localize('roll')} ${localize('attack')}</mwc-button
        >
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'custom-roll-app': CustomRollApp;
  }
}
