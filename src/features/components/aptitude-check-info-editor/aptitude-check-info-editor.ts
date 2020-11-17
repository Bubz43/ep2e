import {
  emptyTextDash,
  renderNumberField,
  renderSelectField,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { AptitudeType, enumValues } from '@src/data-enums';
import { ArmorType } from '@src/features/active-armor';
import {
  AptitudeCheckInfo,
  CheckFailureInfo,
  createCheckResultInfo,
} from '@src/features/conditions';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from 'lit-element';
import { AptitudeCheckInfoUpdateEvent } from './aptitude-check-info-update-event';
import styles from './aptitude-check-info-editor.scss';

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

  @internalProperty() private resultInfo = createCheckResultInfo({});

  @internalProperty() private checkFailureInfo: CheckFailureInfo = {
    ...createCheckResultInfo({}),
    additionalDurationPerSuperior: 0,
  };

  private emitUpdate = (changed: Partial<AptitudeCheckInfo>) => {
    this.dispatchEvent(new AptitudeCheckInfoUpdateEvent(changed));
  };

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

          return html` <sl-group label=${localize(state)}> </sl-group> `;
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

  private get renderResultForm() {
    return this[`render${capitalize(this.resultForm)}Form` as const];
  }

  private renderCheckSuccessForm() {
    return html``;
  }

  private renderCheckFailureForm() {
    return html``;
  }

  private renderCriticalCheckFailureForm() {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aptitude-check-info-editor': AptitudeCheckInfoEditor;
  }
}
