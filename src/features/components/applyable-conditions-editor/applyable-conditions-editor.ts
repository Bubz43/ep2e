import { emptyTextDash, renderNumberField, renderSelectField } from "@src/components/field/fields";
import { renderAutoForm } from "@src/components/form/forms";
import { AptitudeType, enumValues } from "@src/data-enums";
import { ArmorType } from "@src/features/active-armor";
import type { ApplyableConditions } from "@src/features/conditions";
import { localize } from "@src/foundry/localization";
import { capitalize } from "@src/foundry/misc-helpers";
import { customElement, LitElement, property, html, internalProperty } from "lit-element";
import styles from "./applyable-conditions-editor.scss";
import { ApplyableConditionsEvent } from "./applyable-conditions-event";

enum ResultState {
  CheckSuccess = "checkSuccess",
  CheckFailure = "checkFailure",
  CriticalFailure = "criticalCheckFailure"
}

/**
 * @fires applyable-conditions-update
 */
@customElement("applyable-conditions-editor")
export class ApplyableConditionsEditor extends LitElement {
  static get is() {
    return "applyable-conditions-editor" as const;
  }

  static styles = [styles];

  @property({ type: Object }) applyableConditions!: ApplyableConditions;

  @internalProperty() private resultForm = ResultState.CheckFailure


  private emitUpdate = (changed: Partial<ApplyableConditions>) => {
    this.dispatchEvent(new ApplyableConditionsEvent(changed))
  }

  render() {
    return html`
      ${renderAutoForm({
        props: this.applyableConditions,
        update: this.emitUpdate,
        fields: ({ check, checkModifier, armorAsModifier }) => [
          renderSelectField(check, enumValues(AptitudeType)),
          renderNumberField(checkModifier),
          renderSelectField(armorAsModifier, enumValues(ArmorType), emptyTextDash)
        ]
      })}

      <div class="result-conditions">
        ${enumValues(ResultState).map(state => {
          const list = this.applyableConditions[state]

          return html`
          <sl-group label=${localize(state)}>
          
        </sl-group>
          `
        })}
      </div>

      ${renderAutoForm({
        props:  { result: this.resultForm },
        update: ({ result }) => result && (this.resultForm = result),
        fields: ({ result}) => renderSelectField(result, enumValues(ResultState))
      })}

      ${this.renderResultForm()}
    `;
  }

  private get renderResultForm() {
    return this[`render${capitalize(this.resultForm)}Form` as const]
  }

  private renderCheckSuccessForm() {
    return html``
  }

  private renderCheckFailureForm() {
    return html``
  }

  private renderCriticalCheckFailureForm() {
    return html``
  }



}

declare global {
  interface HTMLElementTagNameMap {
    "applyable-conditions-editor": ApplyableConditionsEditor;
  }
}
