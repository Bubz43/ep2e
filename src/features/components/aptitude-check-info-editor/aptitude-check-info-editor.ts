import {
  emptyTextDash,
  renderFormulaField,
  renderNumberField,

  renderSelectField,
  renderTextField,
  renderTimeField
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { AptitudeType, enumValues } from '@src/data-enums';
import { ArmorType } from '@src/features/active-armor';
import {
  AptitudeCheckInfo,
  CheckResultInfo,
  checkResultInfoWithDefaults,

  CheckResultState,

  formatCheckResultInfo
} from "@src/features/aptitude-check-result-info";
import {
  ConditionType
} from '@src/features/conditions';
import { CommonInterval } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { notEmpty, safeMerge } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property
} from 'lit-element';
import { concat, objOf, omit, pipe } from 'remeda';
import styles from './aptitude-check-info-editor.scss';
import { AptitudeCheckInfoUpdateEvent } from './aptitude-check-info-update-event';


enum DurationEdit {
  Static = 'static',
  Variable = 'variable',
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

  @property({
    type: Object,
    hasChanged() {
      return true;
    },
  })
  readonly aptitudeCheckInfo!: AptitudeCheckInfo;

  @internalProperty() private resultType = CheckResultState.CheckFailure;

  @internalProperty() private resultInfo = checkResultInfoWithDefaults({});

  @internalProperty() private durationEdit = DurationEdit.Static;

  private emitUpdate = (changed: Partial<AptitudeCheckInfo>) => {
    this.dispatchEvent(new AptitudeCheckInfoUpdateEvent(changed));
  };

  private resetResultInfo() {
    this.resultInfo = checkResultInfoWithDefaults({});
    this.durationEdit = DurationEdit.Static
  }

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
        this.aptitudeCheckInfo[this.resultType],
        concat([
          this.resultType === CheckResultState.CheckFailure
            ? this.resultInfo
            : omit(this.resultInfo, ['additionalDurationPerSuperior']),
        ]),
        objOf(this.resultType),
        this.emitUpdate,
      );
      this.resetResultInfo();
    }
  }

  private updateResultInfo = (changed: Partial<CheckResultInfo>) => {
    this.resultInfo = safeMerge(this.resultInfo, changed);
  };

  render() {
    const showAll = !!this.aptitudeCheckInfo.check;
    return html`
      ${renderAutoForm({
        props: this.aptitudeCheckInfo,
        update: this.emitUpdate,
        classes: 'common-info',
        fields: ({ check, checkModifier, armorAsModifier }) => [
          renderSelectField(check, enumValues(AptitudeType), {
            ...emptyTextDash,
            altLabel: (apt) => localize('FULL', apt),
          }),
          showAll
            ? [
                renderNumberField(checkModifier),
                renderSelectField(
                  armorAsModifier,
                  enumValues(ArmorType),
                  emptyTextDash,
                ),
              ]
            : '',
        ],
      })}
      ${showAll
        ? html`
            <div class="result-conditions">
              ${enumValues(CheckResultState).map((state) => {
                const list = this.aptitudeCheckInfo[state];

                return notEmpty(list) ? html`
                  <sl-group label=${localize(state)}>
                    ${list.map(
                      (entry, index) => html`
                        <wl-list-item
                          clickable
                          @click=${() => {
                            const copy = [...list];
                            copy.splice(index, 1);
                            this.emitUpdate({ [state]: copy });
                          }}
                          >${formatCheckResultInfo(entry)}
                          <mwc-icon slot="after">delete_forever</mwc-icon>
                          </wl-list-item
                        >
                      `,
                    )}
                  </sl-group>
                ` : ""
              })}
            </div>

            <div class="result-edits">
              ${renderAutoForm({
                props: { result: this.resultType },
                update: ({ result }) => result && (this.resultType = result),
                fields: ({ result }) =>
                  renderSelectField(result, enumValues(CheckResultState)),
              })}
              ${this.renderResultForm()}
            </div>
          `
        : ''}
    `;
  }

  private renderResultForm() {
    return html`
      ${renderAutoForm({
        props: this.resultInfo,
        update: this.updateResultInfo,
        fields: ({ condition, stress, impairment, notes }) =>
          html`
            <div class="common-settings">
              ${[
                renderSelectField(
                  condition,
                  enumValues(ConditionType),
                  emptyTextDash,
                ),
                renderNumberField(impairment, { max: 0, step: 10, min: -90 }),
              ]}
            </div>
            ${renderFormulaField(stress)} ${renderTextField(notes)}
          `,
      })}
      ${renderAutoForm({
        props: { durationType: this.durationEdit },
        update: ({ durationType }) => {
          if (durationType) {
            this.durationEdit = durationType;
            if (durationType === DurationEdit.Static) {
              this.resultInfo.variableDuration = '';
              this.resultInfo.staticDuration = CommonInterval.Turn;
            } else {
              (this.resultInfo.variableDuration = '1d6'),
                (this.resultInfo.staticDuration = 0);
            }
          }
        },
        fields: ({ durationType }) =>
          renderSelectField(
            {
              ...durationType,
              label: `${localize('duration')} ${localize('type')}`,
            },
            enumValues(DurationEdit),
          ),
      })}
      ${renderAutoForm({
        props: this.resultInfo,
        update: this.updateResultInfo,
        fields: ({
          staticDuration,
          variableDuration,
          variableInterval,
          additionalDurationPerSuperior,
          notes,
        }) => [
          this.durationEdit === DurationEdit.Static
            ? renderTimeField(
                { ...staticDuration, label: localize('duration') },
                { min: 0 },
              )
            : html`
                <div class="variable-duration">
                  ${renderFormulaField({
                    ...variableDuration,
                    label: localize('duration'),
                  })}
                  ${renderSelectField(
                    { ...variableInterval, label: localize('interval') },
                    ['days', 'hours', 'minutes', 'turns'],
                  )}
                </div>
              `,
          this.resultType === CheckResultState.CheckFailure
            ? renderTimeField(additionalDurationPerSuperior, { min: 0 })
            : '',
        ],
      })}

      <div class="buttons">
        <mwc-button
          outlined
          label=${localize('reset')}
          @click=${this.resetResultInfo}
          icon="undo"
        ></mwc-button>
        <submit-button
          ?complete=${this.infoIsComplete}
          label=${localize('add')}
          @submit-attempt=${this.addInfo}
        ></submit-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aptitude-check-info-editor': AptitudeCheckInfoEditor;
  }
}
