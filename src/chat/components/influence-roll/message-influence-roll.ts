import type { InfluenceRollData } from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import { influenceRolls } from '@src/features/psi-influence';
import { customElement, html, property } from 'lit-element';
import { MessageElement } from '../message-element';
import styles from './message-influence-roll.scss';

@customElement('message-influence-roll')
export class MessageInfluenceRoll extends MessageElement {
  static get is() {
    return 'message-influence-roll' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) influenceRoll!: InfluenceRollData;

  private applyInfluence() {
    const { actor } = this.message;
    if (actor?.proxy.type === ActorType.Character) {
      // TODO
    }
  }

  render() {
    const { total } = this.influenceRoll.rollData;
    const { influences } = this.influenceRoll;
    return html`
      <mwc-list>
        ${influenceRolls.map((roll) => {
          const selected = roll === total;
          return html`
            <mwc-list-item
              ?selected=${selected}
              ?noninteractive=${!selected}
              @click=${this.applyInfluence}
              >${influences[roll].name}</mwc-list-item
            >
          `;
        })}
      </mwc-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-influence-roll': MessageInfluenceRoll;
  }
}
