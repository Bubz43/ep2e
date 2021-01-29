import { createMessage } from '@src/chat/create-message';
import {
  CombatParticipant,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { ActorType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { rollFormula } from '@src/foundry/rolls';
import { openMenu } from '@src/open-menu';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './participant-item.scss';

@customElement('participant-item')
export class ParticipantItem extends LitElement {
  static get is() {
    return 'participant-item' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) participant!: CombatParticipant;

  private openMenu() {
    if (!this.editable) return;
    openMenu({
      header: { heading: this.participant.name },
      content: [
        {
          label: localize('delete'),
          callback: () =>
            updateCombatState({
              type: 'removeParticipants',
              payload: [this.participant.id],
            }),
        },
        {
          label: `${localize(
            this.participant.initiative == null ? 'roll' : 'reRoll',
          )} ${localize("initiative")}`,
          callback: () => this.rollInitiative()
        },
      ],
    });
  }

  private get editable() {
    return game.user.isGM || this.participant.actor?.owner;
  }

  private rollInitiative() {
    const bonus =
      this.participant.actor?.proxy.type === ActorType.Character
        ? this.participant.actor.proxy.initiative
        : 0;
    const roll = rollFormula(`1d6 + ${bonus}`);

    if (roll) {
      createMessage({
        roll,
        flavor: `${this.participant.name} - ${localize("initiative")}`,
        entity: this.participant.token ?? this.participant.actor,
      });
    }

    updateCombatState({
      type: 'updateParticipants',
      payload: [
        { id: this.participant.id, initiative: String(roll?.total || 0) },
      ],
    });
  }

  render() {
    const { participant } = this;
    const { editable } = this;
    return html`
      <wl-list-item @contextmenu=${this.openMenu}>
        <span>${participant.name}</span>
        ${participant.initiative
          ? html` <span slot="after">${participant.initiative}</span> `
          : editable
          ? html`
              <mwc-icon-button slot="after" @click=${this.rollInitiative}
                ><img src="icons/svg/d20.svg"
              /></mwc-icon-button>
            `
          : html` <span slot="after"> - </span> `}
      </wl-list-item>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-item': ParticipantItem;
  }
}
