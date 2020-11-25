import { renderNumberField } from '@src/components/field/fields';
import { renderSubmitForm } from '@src/components/form/forms';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { PoolType, RechargeType } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { removeFeature, StringID } from '@src/features/feature-helpers';
import type { ActiveRecharge } from '@src/features/temporary';
import { getElapsedTime, prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import mix from 'mix-with/lib';
import styles from './character-view-recharge-completion.scss';

type InternalPool = Record<'oldPoints' | 'newPoints' | 'max', number>;

type CompletionState = {
  localPools: Map<PoolType, InternalPool>;
  unspent: number;
  missing: number;
};

@customElement('character-view-recharge-completion')
export class CharacterViewRechargeCompletion extends mix(LitElement).with(UseWorldTime) {
  static get is() {
    return 'character-view-recharge-completion' as const;
  }

  static styles = [styles];

  @property({ type: Object }) activeRecharge!: StringID<ActiveRecharge>;

  @property({ attribute: false }) character!: Character;

  @internalProperty() private overrideDuration = false;

  private state!: CompletionState;

  private alteredRegained?: number;

  connectedCallback() {
    this.setupState();
    super.connectedCallback();
  }

  get updatedSpentPools() {
    return new Map(
      [...this.state.localPools].map(
        ([pool, { newPoints, max }]) => [pool, max - newPoints] as const,
      ),
    );
  }

  private get regained() {
    return this.alteredRegained ??
      this.activeRecharge.rechargeType === RechargeType.Long
      ? this.character.pools.totalSpent
      : this.activeRecharge.regainedPoints;
  }

  private setupState() {
    const { pools } = this.character;
    const { regained } = this;
    const { totalSpent } = pools;

    const autoFill = totalSpent <= regained;

    const local = new Map<PoolType, InternalPool>();

    let unspent = regained;
    let missing = totalSpent;

    for (const { max, available, type } of [...pools.values()]) {
      if (autoFill) {
        const diff = max - available;
        unspent -= diff;
        missing -= diff;
      }
      local.set(type, {
        oldPoints: available,
        newPoints: autoFill ? max : available,
        max,
      });
    }

    this.state = {
      localPools: local,
      unspent,
      missing,
    };
  }

  private mutate({ pool, increase }: { pool: PoolType; increase: boolean }) {
    const change = increase ? 1 : -1;
    this.state.missing -= change;
    this.state.unspent -= change;
    const newPool = this.state.localPools.get(pool);
    if (newPool) newPool.newPoints += change;
    this.requestUpdate();
  }

  private toggleOverride() {
    this.overrideDuration = !this.overrideDuration;
  }

  private complete() {
    this.character.completeRecharge(
      this.activeRecharge.rechargeType,
      this.updatedSpentPools,
    );
  }

  private alterRegainedForm = () => {
    return renderSubmitForm({
      props: { regained: this.regained },
      update: ({ regained }) => {
        this.alteredRegained = regained;
        this.setupState();
        this.requestUpdate();
      },
      fields: ({ regained }) =>
        renderNumberField(regained, {
          min: 0,
          max: this.character.pools.totalSpent,
        }),
    });
  };

  private cancelRecharge() {
    this.character.updater
      .prop('data', 'temporary')
      .commit(removeFeature(this.activeRecharge.id));
  }

  render() {
    const { state, activeRecharge, overrideDuration, regained } = this;
    const { disabled, timeTillRechargeComplete } = this.character;

    if (timeTillRechargeComplete && !overrideDuration) {
      return html`
        <p>
          ${prettyMilliseconds(timeTillRechargeComplete, {
            compact: false,
          })}
          ${localize('remaining').toLocaleLowerCase()}...
        </p>

        <div class="complete-buttons">
          <mwc-button
            class="cancel-recharge"
            @click=${this.cancelRecharge}
            label="${localize('cancel')} ${localize('recharge')}"
          ></mwc-button>

          <mwc-button
            unelevated
            ?disabled=${disabled}
            @click=${this.toggleOverride}
            label="${localize('complete')} ${localize('now')}"
          ></mwc-button>
        </div>
      `;
    }
    const { localPools, unspent, missing } = state;
    const completeButton = html`
      <mwc-button
        @click=${this.complete}
        class="complete-recharge"
        icon="done_outline"
        raised
        label=${localize('complete')}
      ></mwc-button>
    `;

    return html`
      <section class="info">
        <sl-group class="regained" label=${localize('regainedPoints')}
          ><sl-popover .renderOnDemand=${this.alterRegainedForm}>
            <span slot="base" class="value regained-points"> ${regained} </span>
          </sl-popover></sl-group
        >
        <sl-group
          class="missing"
          label="${localize('missing')} ${localize('pools')}"
          ><span class="value">${missing}</span></sl-group
        >
        <sl-group
          class="unspent"
          label="${localize('unspent')} ${localize('points')}"
          ><span class="value">${unspent}</span></sl-group
        >
      </section>

      <ul class="pool-controls">
        ${[...localPools].map(
          ([pool, { oldPoints, newPoints, max }]) => html`
            <wl-list-item ?disabled=${oldPoints === max} clickable>
              <span slot="before" class="before">
                ${localize(pool)}
                <span class="numbers">${oldPoints} / ${max}</span>
              </span>

              <div class="to-new">
                <mwc-icon class="right-arrow">arrow_right_alt</mwc-icon>
                <span class="new-values">${newPoints} / ${max}</span>
              </div>

              <div class="control-buttons" slot="after">
                ${([
                  ['remove', newPoints === oldPoints],
                  ['add', newPoints === max || unspent === 0],
                ] as const).map(
                  ([icon, disable]) => html`
                    <button
                      @click=${() =>
                        this.mutate({ pool, increase: icon === 'add' })}
                      class=${icon}
                      ?disabled=${disable}
                    >
                      <mwc-icon>${icon}</mwc-icon>
                    </button>
                  `,
                )}
              </div>
            </wl-list-item>
          `,
        )}
      </ul>

      <div class="complete-buttons">
        ${this.overrideDuration === true
          ? html`
              <mwc-button
                outline
                class="revert-override"
                label=${localize('cancel')}
                @click=${this.toggleOverride}
              ></mwc-button>
            `
          : ''}
        ${missing > 0 && unspent > 0
          ? html`
              <sl-popover minimal center>
                <mwc-button
                  class="complete-recharge missing"
                  extended
                  outlined
                  icon="new_releases"
                  label="${localize('points')} ${localize('unspent')}"
                  slot="base"
                ></mwc-button>
                ${completeButton}
              </sl-popover>
            `
          : completeButton}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-recharge-completion': CharacterViewRechargeCompletion;
  }
}
