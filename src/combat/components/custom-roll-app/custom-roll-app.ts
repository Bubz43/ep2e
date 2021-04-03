import {
  renderFormulaField,
  renderLabeledCheckbox,
  renderSelectField,
  renderTextField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { ArmorType } from '@src/features/active-armor';
import { localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
import { customElement, html, internalProperty, LitElement } from 'lit-element';
import { mapToObj } from 'remeda';
import styles from './custom-roll-app.scss';

const createInitialState = () => ({
  source: localize('custom'),
  formula: '1d6',
  damageType: HealthType.Physical,
  ...mapToObj(enumValues(ArmorType), (type) => [type, false]),
  armorPiercing: false,
  reduceAVbyDV: false,
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
    if (!this.isComplete) return;
    window.ep2e.rollCustomAttack(this.toAttackInit());
  }

  private toAttackInit() {
    const {
      source,
      formula,
      damageType,
      armorPiercing,
      reduceAVbyDV,
      ...armors
    } = this.attackData;
    return {
      source,
      formulas: [{ label: localize('base'), formula }],
      damageType,
      armorUsed: enumValues(ArmorType).filter((type) => armors[type]),
      armorPiercing,
      reduceAVbyDV,
    };
  }

  private reset() {
    this.attackData = createInitialState();
  }

  private get usesArmor() {
    return enumValues(ArmorType).some((type) => this.attackData[type]);
  }

  private async saveToMacro() {
    if (!this.isComplete) return;
    const macro: Macro = await Macro.create({
      name: this.attackData.source,
      type: 'script',
      command: `window.ep2e.rollCustomAttack(${JSON.stringify(
        this.toAttackInit(),
      )})`,
    });
    macro.sheet?.render(true);
  }

  private get isComplete() {
    return !!(this.attackData.source && this.attackData.formula);
  }

  render() {
    const { usesArmor, isComplete } = this;
    return html`
      ${renderAutoForm({
        props: this.attackData,
        noDebounce: true,
        update: (changes) => {
          this.attackData = { ...this.attackData, ...changes };
          if (!this.usesArmor) {
            this.attackData.armorPiercing = false;
            this.attackData.reduceAVbyDV = false;
          }
        },
        fields: ({
          source,
          formula,
          damageType,
          armorPiercing,
          reduceAVbyDV,
          ...armors
        }) => [
          renderTextField(source, { required: true }),
          renderFormulaField(formula, { required: true }),
          renderSelectField(damageType, enumValues(HealthType)),
          html`<span>${localize('armorUsed')}</span>
            <div class="armor-types">
              ${enumValues(ArmorType).map((type) =>
                renderLabeledCheckbox(armors[type], {
                  reducedTouchTarget: true,
                }),
              )}
            </div>`,
          renderLabeledCheckbox(armorPiercing, {
            reducedTouchTarget: true,
            disabled: !usesArmor,
          }),
          renderLabeledCheckbox(reduceAVbyDV, {
            reducedTouchTarget: true,
            disabled: !usesArmor,
          }),
        ],
      })}

      <div class="actions">
        <submit-button
          class="macro"
          icon="save"
          outlined
          ?complete=${isComplete}
          @click=${this.saveToMacro}
          >${localize('save')} ${localize('to')}
          ${localize('macro')}</submit-button
        >
        <mwc-button @click=${this.reset}>${localize('reset')}</mwc-button>

        <submit-button
          ?complete=${isComplete}
          raised
          @click=${this.rollAttack}
          class="roll-attack"
          >${localize('roll')} ${localize('attack')}</submit-button
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
