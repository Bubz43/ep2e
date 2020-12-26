import type { ExplosiveMessageData } from '@src/chat/message-data';
import { Explosive } from '@src/entities/item/proxies/explosive';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './message-explosive.scss';

@customElement('message-explosive')
export class MessageExplosive extends LitElement {
  static get is() {
    return 'message-explosive' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) explosiveUse!: ExplosiveMessageData;

  get explosive() {
    return new Explosive({
      data: this.explosiveUse.explosive,
      loaded: false,
      embedded: null,
    });
  }

  render() {
    // const { explosive } = this;
    const { state, trigger, timerDuration, duration } = this.explosiveUse;
    // TODO change trigger and durations
    return html`
      <sl-group label=${localize('trigger')}>${localize(trigger)}</sl-group>
      ${state
        ? html` <p class="state">${localize(state)}</p> `
        : html`
            <div class="actions">
              <mwc-button dense class="detonate"
                >${localize('detonate')}</mwc-button
              >
              <mwc-button dense class="reclaim"
                >${localize('reclaim')}</mwc-button
              >
            </div>
          `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-explosive': MessageExplosive;
  }
}
