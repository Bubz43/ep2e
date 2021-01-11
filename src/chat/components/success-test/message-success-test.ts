import type { SuccessTestMessage } from '@src/chat/message-data';
import { renderNumberInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { ActorType } from '@src/entities/entity-types';
import { PostTestPoolAction } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import { tooltip } from '@src/init';
import {
  flipFlopRoll,
  getSuccessTestResult,
  improveSuccessTestResult,
  SuccessTestResult,
} from '@src/success-test/success-test';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  eventOptions,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { identity, pick } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-success-test.scss';

const toSpan = (character: string) => html`<span>${character}</span>`;

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

  @internalProperty() private editing = false;

  @internalProperty() private preview: {
    roll: number;
    result: SuccessTestResult;
  } | null = null;

  private previewTimeout?: ReturnType<typeof setTimeout> 

  private setDefaultRoll(ev: Event) {
    if (ev.target instanceof HTMLInputElement) {
      this.setRoll ??= this.successTest.roll ?? 50;
    }
  }

  private updateRoll() {
    const roll = this.setRoll ?? 50;
    const result = getSuccessTestResult({
      roll,
      ...pick(this.successTest, ['defaulting', 'target']),
    });
    this.getUpdater('successTest').commit({ roll, result });
  }

  private startEditing() {
    this.editing = true;
  }

  private endEditing() {
    this.editing = false;
    this.setRoll = null;
  }

  @eventOptions({ capture: true })
  private submitIfEnter(ev: KeyboardEvent) {
    if (ev.key === 'Enter') this.updateRoll();
  }

  // private previewPoolAction(action: PostTestPoolAction) {
  //   this[`preview${capitalize(action)}` as const]()
  // }

  private previewFlipFlopRoll() {
    this.clearPreviewTimeout()
    const { roll, target, defaulting } = this.successTest;
    if (roll == null) return;
    const flipped = flipFlopRoll(roll);
    this.preview = {
      roll: flipped,
      result: getSuccessTestResult({ roll: flipped, target, defaulting }),
    };
  }

  private previewImproveResult() {
        this.clearPreviewTimeout();
    const { roll, result } = this.successTest;
    if (roll == null || !result) return;
    this.preview = {
      roll,
      result: improveSuccessTestResult(result),
    };
  }

  private endPreview() {
    
    this.previewTimeout = setTimeout(() => {
          this.preview = null;
    }, 100);
  }

  private clearPreviewTimeout() {
    clearTimeout(this.previewTimeout)
  }
  private getPoolActionState() {}

  render() {
    const {
      parts,
      roll,
      target,
      result,
      defaulting,
      poolActions,
      linkedPool,
    } = this.successTest;
    const { actor, editable } = this.message;
    const isCharacter = actor?.type === ActorType.Character;

    if (this.editing || roll == null || !result) {
      return html`
        <div class="groups">
          <sl-group class="roll" label=${localize('roll')}>
            ${editable ? this.renderRollEdit() : ' - '}
          </sl-group>
          <sl-group label=${localize('target')}>${target}</sl-group>
          <sl-group label=${localize('result')}
            >${this.editing || this.setRoll != null
              ? html`<sl-animated-list class="result-chars"
                  >${this.spannedResult(
                    localize(
                      getSuccessTestResult({
                        roll: this.setRoll ?? roll ?? 50,
                        target,
                        defaulting,
                      }),
                    ),
                  )}</sl-animated-list
                >`
              : '-'}</sl-group
          >
        </div>
      `;
    }

    return html`
      <div class="groups">
        <sl-group label=${localize('roll')} class="roll"
          ><sl-animated-list
            >${this.spannedRoll(this.preview?.roll ?? roll)}</sl-animated-list
          >
          ${editable
            ? html`<mwc-icon-button
                @click=${this.startEditing}
                class="edit-toggle"
                icon="edit"
              ></mwc-icon-button>`
            : ''}</sl-group
        >
        <sl-group label=${localize('target')}>${target}</sl-group>
        <sl-group label=${localize('result')}>
          <sl-animated-list class="result-chars">
            ${this.spannedResult(localize(this.preview?.result ?? result))}
          </sl-animated-list>
        </sl-group>
      </div>
      ${isCharacter && linkedPool
        ? html` <div class="pool-actions">
            ${roll === flipFlopRoll(roll)
              ? ''
              : html` <mwc-icon-button
                  icon="swap_horiz"
                  @mouseover=${this.previewFlipFlopRoll}
                  @mouseout=${this.endPreview}
                ></mwc-icon-button>`}
            ${result === improveSuccessTestResult(result)
              ? ''
              : html` <mwc-icon-button
                  icon="upgrade"
                  @mouseover=${this.previewImproveResult}
                  @mouseout=${this.endPreview}
                ></mwc-icon-button>`}
          </div>`
        : ''}
    `;
  }

  private spannedRoll(roll: number) {
    const chars = [...String(roll)];
    if (chars.length === 1) chars.unshift('0');
    return repeat(chars, identity, toSpan);
  }

  private spannedResult(result: string) {
    return repeat([...result], (c, i) => c + i, toSpan);
  }

  private renderRollEdit() {
    return html`<div
      class="edit"
      @keydown=${this.submitIfEnter}
      @focus=${this.setDefaultRoll}
    >
      ${renderAutoForm({
        classes: `roll-edit ${
          this.editing || this.setRoll != null ? 'filled' : ''
        }`,
        props: { roll: this.setRoll ?? this.successTest.roll ?? 50 },
        storeOnInput: true,
        update: ({ roll = 50 }) => {
          console.log(this.hasUpdated);
          this.setRoll = roll;
        },
        fields: ({ roll }) => renderNumberInput(roll, { min: 0, max: 99 }),
      })}
      <mwc-icon-button icon="save" @click=${this.updateRoll}></mwc-icon-button>
      <mwc-icon-button icon="close" @click=${this.endEditing}></mwc-icon-button>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-success-test': MessageSuccessTest;
  }
}
