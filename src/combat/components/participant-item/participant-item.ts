import { createMessage, MessageVisibility } from '@src/chat/create-message';
import {
  CombatActionType,
  CombatParticipant,
  LimitedAction,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { ActorType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { rollFormula } from '@src/foundry/rolls';
import { openMenu } from '@src/open-menu';
import produce from 'immer';
import { customElement, LitElement, property, html } from 'lit-element';
import { compact } from 'remeda';
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

  @property({ type: String }) limitedAction?: LimitedAction;

  @property({ type: Boolean }) active = false;

  @property({ type: Number }) round = 0;

  private openMenu() {
    if (!this.editable) return;
    const modifiedRoundActions = this.participant.modifiedTurn?.[this.round];
    openMenu({
      header: { heading: this.participant.name },
      content: compact([
        ...(this.participant.actor?.proxy.type === ActorType.Character
          ? [ // TODO Use pools to modify action
              {
                label: localize('takeTheInitiative'),
                disabled: !!modifiedRoundActions?.tookInitiative,
                callback: () =>
                  updateCombatState({
                    type: CombatActionType.UpdateParticipants,
                    payload: [
                      {
                        id: this.participant.id,
                        modifiedTurn: produce(
                          this.participant.modifiedTurn ?? {},
                          (draft) => {
                            draft[this.round] = {
                              ...(draft[this.round] || {}),
                              tookInitiative: LimitedAction.Mental,
                            };
                          },
                        ),
                      },
                    ],
                  }),
              },
              {
                label: localize('takeExtraAction'),
                disabled:
                  (!!modifiedRoundActions?.tookInitiative?.length || 0) >= 2,
                callback: () => {
                  updateCombatState({
                    type: CombatActionType.UpdateParticipants,
                    payload: [
                      {
                        id: this.participant.id,
                        modifiedTurn: produce(
                          this.participant.modifiedTurn ?? {},
                          (draft) => {
                            draft[this.round] = {
                              ...(draft[this.round] || {}),
                              extraActions: compact([
                                ...(draft[this.round]?.extraActions || []),
                              ]).concat(LimitedAction.Physical),
                            };
                          },
                        ),
                      },
                    ],
                  });
                },
              },
            ]
          : []),
        {
          label: `${localize(
            this.participant.initiative == null ? 'roll' : 'reRoll',
          )} ${localize('initiative')}`,
          callback: () => this.rollInitiative(),
        },
        {
          label: localize('delete'),
          callback: () =>
            updateCombatState({
              type: CombatActionType.RemoveParticipants,
              payload: [this.participant.id],
            }),
        },
      ]),
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
        flavor: localize('initiative'),
        entity: this.participant.token ?? this.participant.actor,
        alias: this.participant.name,
        visibility: this.participant.hidden
          ? MessageVisibility.WhisperGM
          : MessageVisibility.Public,
      });
    }

    updateCombatState({
      type: CombatActionType.UpdateParticipants,
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
