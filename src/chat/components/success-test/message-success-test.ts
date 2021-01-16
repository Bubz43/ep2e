import type { SuccessTestMessageData } from '@src/chat/message-data';
import { renderNumberInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { Placement } from '@src/components/popover/popover-options';
import { PoolType } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import { PostTestPoolAction } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import { RenderDialogEvent } from '@src/open-dialog';
import {
  flipFlopRoll,
  getSuccessTestResult,
  grantedSuperiorResultEffects,
  improveSuccessTestResult,
  SuccessTestResult,
} from '@src/success-test/success-test';
import {
  customElement,
  eventOptions,
  html,
  internalProperty,
  property,
} from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import { compact, identity, last } from 'remeda';
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

  @property({ attribute: false }) successTest!: SuccessTestMessageData;

  @internalProperty() private setRoll?: number | null;

  @internalProperty() private editing = false;

  @internalProperty() private preview: {
    roll: number;
    result: SuccessTestResult;
  } | null = null;

  private previewTimeout?: ReturnType<typeof setTimeout>;

  private setDefaultRoll(ev: Event) {
    if (ev.target instanceof HTMLInputElement) {
      this.setRoll ??= this.currentState?.roll ?? 50;
    }
  }

  private get currentState() {
    return last(this.successTest.states);
  }

  private get usedPoolActions() {
    return this.successTest.states.flatMap(({ action }) =>
      Array.isArray(action) ? [action] : [],
    );
  }

  private get partTotal() {
    return this.successTest.parts.reduce(
      (accum, { value }) => accum + value,
      0,
    );
  }

  private updateRoll() {
    const roll = this.setRoll ?? 50;
    const target = this.currentState?.target ?? this.partTotal;
    const result = getSuccessTestResult({
      roll,
      defaulting: this.successTest.defaulting,
      target,
    });
    const steps = this.successTest.states.concat({
      roll,
      target,
      result,
      action: 'edit',
    });
    const grantedSuperiorEffects = grantedSuperiorResultEffects(result);

    this.getUpdater('successTest').commit({
      states: steps,
      superiorResultEffects: this.successTest.superiorResultEffects?.slice(
        0,
        grantedSuperiorEffects,
      ),
    });
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

  private previewPoolAction(action: PostTestPoolAction) {
    return this[`preview${capitalize(action)}` as const]();
  }

  private previewFlipFlopRoll() {
    this.clearPreviewTimeout();
    const { defaulting } = this.successTest;
    const { roll, target = this.partTotal } = this.currentState ?? {};
    if (roll == null) return;
    const flipped = flipFlopRoll(roll);
    this.preview = {
      roll: flipped,
      result: getSuccessTestResult({ roll: flipped, target, defaulting }),
    };
    return this.preview;
  }

  private previewImproveResult() {
    this.clearPreviewTimeout();
    const { roll, result } = this.currentState ?? {};
    if (roll == null || !result) return;
    this.preview = {
      roll,
      result: improveSuccessTestResult(result),
    };
    return this.preview;
  }

  private endPreview() {
    this.previewTimeout = setTimeout(() => {
      this.preview = null;
    }, 100);
  }

  private clearPreviewTimeout() {
    clearTimeout(this.previewTimeout);
  }

  private showLog() {
    this.dispatchEvent(
      new RenderDialogEvent(html`
        <mwc-dialog
          hideActions
          heading=${ifDefined(this.message.epFlags?.header?.heading)}
        >
          <div
            class="state-log"
            style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem"
          >
            ${this.successTest.states.map(
              (state, index) => html`
                <sl-details
                  summary=${index === 0
                    ? localize('original')
                    : `${localize('change')} ${index}`}
                  open
                >
                  <div class="pairs" style="display: grid">
                    ${(['roll', 'target', 'result'] as const).map(
                      (key) => html`
                        <sl-group label=${localize(key)}
                          >${key === 'result' && state.result
                            ? localize(state.result)
                            : state[key] ?? '-'}</sl-group
                        >
                      `,
                    )}
                  </div>
                  <hr style="border-color: var(--color-border)" />
                  ${typeof state.action === 'string'
                    ? localize(state.action)
                    : html`<sl-group label=${localize(state.action[0])}
                        >${localize(state.action[1])}</sl-group
                      > `}
                </sl-details>
              `,
            )}
          </div></mwc-dialog
        >
      `),
    );
  }

  render() {
    const {
      defaulting,
      linkedPool,
      states,
      task,
      superiorResultEffects,
    } = this.successTest;
    const { actor, editable } = this.message;
    const isCharacter = actor?.type === ActorType.Character;
    const { roll, target = this.partTotal, result } = this.currentState ?? {};
    const { usedPoolActions } = this;

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

    const grantedSuperiorEffects = grantedSuperiorResultEffects(result);

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
        <sl-popover
          placement=${Placement.Left}
          .renderOnDemand=${this.renderUsedParts}
        >
          <button slot="base" class="part-toggle">
            <sl-group label=${localize('target')}>${target}</sl-group>
          </button>
        </sl-popover>
        <sl-group label=${localize('result')}>
          <sl-animated-list class="result-chars">
            ${this.spannedResult(localize(this.preview?.result ?? result))}
          </sl-animated-list>
        </sl-group>
        ${grantedSuperiorEffects ? html`
        <sl-group label="${localize("superior")} ${localize("result")} ${localize("effects")}">
        
        </sl-group>
        ` : ""}
      </div>
      ${states?.length > 1 || Array.isArray(states[0]?.action)
        ? html`
            <mwc-icon-button
              icon="change_history"
              class="history"
              @click=${this.showLog}
            ></mwc-icon-button>
          `
        : ''}
      ${isCharacter && linkedPool && usedPoolActions?.length !== 2
        ? html` <div class="pool-actions">
            ${roll === flipFlopRoll(roll)
              ? ''
              : html` <sl-popover
                  placement=${Placement.Top}
                  @mouseover=${this.previewFlipFlopRoll}
                  @mouseout=${this.endPreview}
                  .renderOnDemand=${() =>
                    this.renderPoolPopover(PostTestPoolAction.FlipFlop)}
                  ><mwc-icon-button
                    slot="base"
                    icon="swap_horiz"
                  ></mwc-icon-button
                ></sl-popover>`}
            ${result === improveSuccessTestResult(result)
              ? ''
              : html` <sl-popover
                  placement=${Placement.Top}
                  @mouseover=${this.previewImproveResult}
                  @mouseout=${this.endPreview}
                  .renderOnDemand=${() =>
                    this.renderPoolPopover(PostTestPoolAction.Improve)}
                  ><mwc-icon-button slot="base" icon="upgrade"></mwc-icon-button
                ></sl-popover>`}
          </div>`
        : ''}
      ${isCharacter && result && task && editable ? this.renderTask(task) : ''}
    `;
  }

  private renderTask(task: NonNullable<SuccessTestMessageData['task']>) {
    return html`
      <mwc-button
        class="task"
        unelevated
        dense
        ?disabled=${!!task.startedTaskId}
        >${task.startedTaskId
          ? `${localize('task')} ${localize('started')}`
          : `${localize('start')} ${localize('task')}`}</mwc-button
      >
    `;
  }

  private renderUsedParts = () => {
    return html`
      <ul class="used-parts">
        ${this.successTest.parts.map(
          (part) => html`
            <wl-list-item>
              <span>${part.name}</span>
              <span slot="after">${part.value}</span>
            </wl-list-item>
          `,
        )}
        ${this.successTest.ignoredModifiers != null
          ? html`
              <li class="divider"></li>
              <wl-list-item>
                <span>${localize('ignoredModifiers')}</span>
                <span slot="after">${this.successTest.ignoredModifiers}</span>
              </wl-list-item>
            `
          : ''}
      </ul>
    `;
  };

  private renderPoolPopover(action: PostTestPoolAction) {
    const { linkedPool } = this.successTest;
    const { usedPoolActions } = this;
    const { actor } = this.message;
    if (!linkedPool || actor?.proxy.type !== ActorType.Character)
      return html`
        <p>${localize('no')} ${localize('available')} ${localize('pools')}</p>
      `;
    const { proxy: character } = actor;
    const pools = compact(
      [linkedPool, PoolType.Flex, PoolType.Threat].map((type) =>
        character.pools.get(type),
      ),
    );

    if (pools.length === 0)
      return html`
        <p>${localize('no')} ${localize('available')} ${localize('pools')}</p>
      `;

    if (action === PostTestPoolAction.FlipFlop && character.cannotFlipFlop)
      return html` <p>${localize('cannot')} ${localize('flipFlopRoll')}</p> `;

    const usedPool = usedPoolActions?.[0]?.[0];

    return html`
      <sl-popover-section heading=${localize(action)} class="pool-selector">
        <mwc-list>
          ${pools.map((pool) => {
            return usedPool && usedPool !== pool.type
              ? ''
              : html`
                  <mwc-list-item
                    graphic="icon"
                    ?twoline=${!!usedPool}
                    ?disabled=${!pool.available ||
                    !!(usedPool && !pool.usableTwice)}
                    @click=${() => {
                      const preview = this.previewPoolAction(action);
                      if (preview) {
                        const grantedSuperiorEffects = grantedSuperiorResultEffects(
                          preview.result,
                        );
                        this.getUpdater('successTest').commit({
                          states: this.successTest.states.concat({
                            ...preview,
                            target: this.currentState?.target ?? this.partTotal,
                            action: [pool.type, action],
                          }),
                          superiorResultEffects: this.successTest.superiorResultEffects?.slice(
                            0,
                            grantedSuperiorEffects,
                          ),
                        });
                      }
                    }}
                  >
                    <img src=${pool.icon} slot="graphic" />
                    <span
                      >${localize(pool.type)} (${pool.available} /
                      ${pool.max})</span
                    >
                    ${usedPool
                      ? html`
                          <span slot="secondary">
                            ${pool.usableTwice
                              ? localize('usableTwice')
                              : `${localize('not')} ${localize('usableTwice')}`}
                          </span>
                        `
                      : ''}
                  </mwc-list-item>
                `;
          })}
        </mwc-list>
      </sl-popover-section>
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
        props: { roll: this.setRoll ?? this.currentState?.roll ?? 50 },
        storeOnInput: true,
        update: ({ roll = 50 }) => {
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
