import {
  renderFormulaField,
  renderNumberField,
  renderSelectField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { enumValues } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { createStressDamage, StressDamage } from '@src/health/health-changes';
import {
  hardeningTypes,
  MentalHealth,
  StressType,
} from '@src/health/mental-health';
import { customElement, html } from 'lit-element';
import { range } from 'remeda';
import { HealthEditBase } from '../health-edit-base';
import styles from './mental-health-stress-editor.scss';
import commonStyles from "../health-edit-base.scss";
/**
 * @fires health-modification - HealthModificationEvent
 */
@customElement('mental-health-stress-editor')
export class MentalHealthStressEditor extends HealthEditBase<
  MentalHealth,
  StressDamage
> {
  static get is() {
    return 'mental-health-stress-editor' as const;
  }

  static styles = [commonStyles, styles];

  protected createEditable() {
    return createStressDamage(this.damage || { damageValue: 0, formula: '' });
  }

  protected createModification() {
    return {
      ...super.createModification(),
      stressType: this.editableDamage.stressType,
    };
  }

  render() {
    return html`
      ${renderAutoForm({
        props: this.editableDamage,
        noDebounce: true,
        update: (changed, orig) =>
          (this.editableDamage = { ...orig, ...changed }),
        fields: ({ stressType }) =>
          renderSelectField(stressType, enumValues(StressType)),
      })}

      <ul class="hardening">
        ${hardeningTypes.map((type) => {
          const val = this.health.hardening[type];
          return html`
            <li>
              ${localize(type)}
              <div>
                ${range(0, 5).map(
                  (place) =>
                    html`<mwc-icon
                      >${place < val
                        ? 'check_box'
                        : 'check_box_outline_blank'}</mwc-icon
                    >`,
                )}
              </div>
            </li>
          `;
        })}
      </ul>

      <div class="stress-damage">
        ${renderAutoForm({
          classes: 'stress-form',
          props: this.editableDamage,
          noDebounce: true,
          update: (changed, orig) =>
            (this.editableDamage = { ...orig, ...changed }),
          fields: ({ damageValue, stressType, formula }) => [
            renderFormulaField(formula),
            renderNumberField(
              { ...damageValue, label: localize('stress') },
              { min: 0 },
            ),
          ],
        })}
        <div class="armor-toggles">
          <mwc-button
            dense
            label=${localize('armorPiercing')}
            ?outlined=${!this.editableDamage.armorPiercing}
            ?unelevated=${this.editableDamage.armorPiercing}
            @click=${this.toggleArmorPiercing}
          ></mwc-button>
          <mwc-button
            ?outlined=${!this.editableDamage.reduceAVbyDV}
            ?unelevated=${this.editableDamage.reduceAVbyDV}
            dense
            label=${localize('reduceAVbyDV')}
            @click=${this.toggleArmorReduce}
          ></mwc-button>
        </div>
      </div>

      ${this.renderCommon()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mental-health-stress-editor': MentalHealthStressEditor;
  }
}
