import type { AttackTraitData } from '@src/chat/message-data';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import type { AttackTrait } from '@src/data-enums';
import { createLiveTimeState, prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import mix from 'mix-with/lib';
import { MessageElement } from '../message-element';
import styles from './message-attack-traits.scss';

// TODO only use world time when time state

@customElement('message-attack-traits')
export class MessageAttackTraits extends mix(MessageElement).with(
  UseWorldTime,
) {
  static get is() {
    return 'message-attack-traits' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) attackTraitInfo!: AttackTraitData;

  private applyTrait(trait: AttackTrait) {}

  private get timeState() {
    const { duration, startTime } = this.attackTraitInfo;
    if (duration && startTime !== undefined) {
      return createLiveTimeState({
        duration,
        startTime,
        label: `${localize('apply')}`,
        id: '',
        updateStartTime: (newTime) =>
          this.getUpdater('attackTraitInfo').commit({ startTime: newTime }),
      });
    }
    return null;
  }

  render() {
    const { traits, notes } = this.attackTraitInfo;
    const { timeState } = this;
    return html`
      <div class="traits">
        ${traits.map(
          (trait) => html`
            <mwc-button
              dense
              unelevated
              label=${localize(trait)}
              @click=${() => this.applyTrait(trait)}
            ></mwc-button>
          `,
        )}
      </div>
      ${timeState
        ? html`
            <div class="time-state">
              ${localize('applyableFor')}
              ${prettyMilliseconds(timeState.remaining)}
            </div>
          `
        : ''}
      ${notes ? html` <p class="notes">${notes}</p> ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-attack-traits': MessageAttackTraits;
  }
}
