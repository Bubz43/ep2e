import type { SuccessTestMessage } from '@src/chat/message-data';
import { renderNumberInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { ActorType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { getSuccessTestResult } from '@src/success-test/success-test';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  eventOptions,
} from 'lit-element';
import { pick } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-success-test.scss';

@customElement('message-success-test')
export class MessageSuccessTest extends MessageElement {
  static get is() {
    return 'message-success-test' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) successTest!: SuccessTestMessage;

  @internalProperty() private setRoll?: number | null;

  private updateRoll() {
    const roll = this.setRoll ?? 50;
    const result = getSuccessTestResult({ roll, ...pick(this.successTest, ["defaulting", "target"])})
    this.getUpdater("successTest").commit({ roll, result })
  }

  @eventOptions({ capture: true })
  private submitIfEnter(ev: KeyboardEvent) {
    if (ev.key === "Enter") this.updateRoll();
  }

  render() {
    const { parts, roll, target, result, defaulting } = this.successTest;
    const { actor, editable } = this.message;
    const character = actor?.proxy.type === ActorType.Character && actor.proxy;

    if (roll == null || !result) {
      return html`
        <sl-group label=${localize('roll')}>
          ${editable
            ? html`<div class="edit" @keydown=${this.submitIfEnter}>
                ${renderAutoForm({
                  classes: `roll-edit ${this.setRoll != null ? 'filled' : ''}`,
                  props: { roll: this.setRoll ?? 50 },
                  storeOnInput: true,
                  update: ({ roll = 50 }) => {
                    console.log(this.hasUpdated);
                    this.setRoll = roll;
                  },
                  fields: ({ roll }) =>
                    renderNumberInput(roll, { min: 0, max: 99 }),
                })}
                ${this.setRoll != null
                  ? html`
                      <mwc-icon-button
                        icon="save"
                        @click=${this.updateRoll}
                      ></mwc-icon-button>
                      <mwc-icon-button
                        icon="close"
                        @click=${() => this.setRoll = null}
                      ></mwc-icon-button>
                    `
                  : ''}
              </div>`
            : ' - '}
        </sl-group>
        <sl-group label=${localize('target')}>${target}</sl-group>
        <sl-group label=${localize('result')}
          >${this.setRoll != null
            ? localize(
                getSuccessTestResult({
                  roll: this.setRoll,
                  target,
                  defaulting,
                }),
              )
            : '-'}</sl-group
        >
      `;
    }

    return html`
      <sl-group label=${localize('roll')}>${roll}</sl-group>
      <sl-group label=${localize('target')}>${target}</sl-group>
      <sl-group label=${localize('result')}>${localize(result)}</sl-group>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-success-test': MessageSuccessTest;
  }
}
