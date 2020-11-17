import {
  emptyTextDash,
  renderFormulaField,
  renderNumberField,
  renderSelectField,
  renderTextField,
  renderTimeField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { AptitudeType, enumValues } from '@src/data-enums';
import { ArmorType } from '@src/features/active-armor';
import {
  AptitudeCheckInfo,
  CheckResultInfo,
  checkResultInfoWithDefaults,
  ConditionType,
  formatCheckResultInfo,
} from '@src/features/conditions';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { AptitudeCheckInfoUpdateEvent } from './aptitude-check-info-update-event';
import styles from './aptitude-check-info-editor.scss';
import { concat, objOf, omit, pipe } from 'remeda';

enum ResultState {
  CheckSuccess = 'checkSuccess',
  CheckFailure = 'checkFailure',
  CriticalFailure = 'criticalCheckFailure',
}

/**
 * @fires aptitude-check-info-update
 */
@customElement('aptitude-check-info-editor')
export class AptitudeCheckInfoEditor extends LitElement {
  static get is() {
    return 'aptitude-check-info-editor' as const;
  }

  static styles = [styles];

  @property({ type: Object }) aptitudeCheckInfo!: AptitudeCheckInfo;

  @internalProperty() private resultForm = ResultState.CheckFailure;

  @internalProperty() private resultInfo = checkResultInfoWithDefaults({});

  private emitUpdate = (changed: Partial<AptitudeCheckInfo>) => {
    this.dispatchEvent(new AptitudeCheckInfoUpdateEvent(changed));
  };

  private get infoIsComplete() {
    const {
      stress,
      condition,
      impairment,
      variableDuration,
      variableInterval,
    } = this.resultInfo;
    return !!(
      (stress || condition || impairment) &&
      (variableDuration || variableInterval)
    );
  }

  private addInfo() {
    
    if (this.infoIsComplete) {
      pipe(
        this.aptitudeCheckInfo[this.resultForm],
        concat([
          this.resultForm === ResultState.CheckFailure
            ? this.resultInfo
            : omit(this.resultInfo, ['additionalDurationPerSuperior']),
        ]),
        objOf(this.resultForm),
        this.emitUpdate,
      );

      this.resultInfo = checkResultInfoWithDefaults({});
    }
  }

  render() {
    return html`
      ${renderAutoForm({
        props: this.aptitudeCheckInfo,
        update: this.emitUpdate,
        fields: ({ check, checkModifier, armorAsModifier }) => [
          renderSelectField(check, enumValues(AptitudeType)),
          renderNumberField(checkModifier),
          renderSelectField(
            armorAsModifier,
            enumValues(ArmorType),
            emptyTextDash,
          ),
        ],
      })}

      <div class="result-conditions">
        ${enumValues(ResultState).map((state) => {
          const list = this.aptitudeCheckInfo[state];

          return html`
            <sl-group label=${localize(state)}>
              ${list.map(
                (entry, index) => html`
                  <wl-list-item
                    clickable
                    @click=${() => {
                      const copy = [...list]
                      copy.splice(index, 1);
                      this.emitUpdate({ [state]: copy })
                    }}
                    >${formatCheckResultInfo(entry)}</wl-list-item
                  >
                `,
              )}
            </sl-group>
          `;
        })}
      </div>

      ${renderAutoForm({
        props: { result: this.resultForm },
        update: ({ result }) => result && (this.resultForm = result),
        fields: ({ result }) =>
          renderSelectField(result, enumValues(ResultState)),
      })}
      ${this.renderResultForm()}
    `;
  }

  private renderResultForm() {
    return html`
      ${renderAutoForm({
        props: this.resultInfo,
        update: (changed) => {
          this.resultInfo = {
            ...this.resultInfo,
            ...changed,
          };
          if (changed.staticDuration) this.resultInfo.variableDuration = '';
          else if (changed.variableDuration) this.resultInfo.staticDuration = 0;
        },
        fields: ({
          condition,
          stress,
          impairment,
          staticDuration,
          variableDuration,
          variableInterval,
          additionalDurationPerSuperior,
          notes,
        }) => [
          renderSelectField(
            condition,
            enumValues(ConditionType),
            emptyTextDash,
          ),
          renderNumberField(impairment, { max: 0 }),
          renderFormulaField(stress),

          renderTimeField(staticDuration, { min: 0 }),
          html`
            <div class="variable-duration">
              ${renderFormulaField(variableDuration)}
              ${renderSelectField(variableInterval, [
                'days',
                'hours',
                'minutes',
                'turns',
              ])}
            </div>
          `,
          this.resultForm === ResultState.CheckFailure
            ? renderTimeField(additionalDurationPerSuperior, { min: 0 })
            : '',
          renderTextField(notes),
        ],
      })}

      <submit-button
        ?complete=${this.infoIsComplete}
        @submit-attempt=${this.addInfo}
      ></submit-button>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aptitude-check-info-editor': AptitudeCheckInfoEditor;
  }
}
