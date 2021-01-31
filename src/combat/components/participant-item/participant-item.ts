import {
  CombatActionType,
  CombatParticipant,
  LimitedAction,
  rollParticipantInitiative,
  TrackedCombatEntity,
  updateCombatState,
} from '@src/combat/combat-tracker';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { ActorType } from '@src/entities/entity-types';
import { findActor } from '@src/entities/find-entities';
import { subscribeToToken } from '@src/entities/subscriptions';
import { conditionIcons } from '@src/features/conditions';
import { readyCanvas } from '@src/foundry/canvas';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import type { TokenData } from '@src/foundry/foundry-cont';
import {
  mutateEntityHook,
  MutateEvent,
  mutatePlaceableHook,
} from '@src/foundry/hook-setups';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import produce from 'immer';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { compact, equals } from 'remeda';
import type { Subscription } from 'rxjs';
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

  @property({ type: Number }) limitedAction?: LimitedAction | null;

  @property({ type: Boolean, reflect: true }) active = false;

  @property({ type: Number }) round = 0;

  @property({ type: Number }) turn = 0;

  @internalProperty() private token?: MaybeToken;

  @internalProperty() private actor?: ActorEP | null;

  private tokenLinked = false;

  private tokenSubscription?: Subscription | null;

  private actorUnsub?: (() => void) | null;

  disconnectedCallback() {
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues<this>) {
    const previous = changedProps.get('participant') as
      | CombatParticipant
      | undefined;
    if (
      !equals(previous?.entityIdentifiers, this.participant.entityIdentifiers)
    ) {
      this.unsubFromAll();
      const { entityIdentifiers } = this.participant;
      if (entityIdentifiers?.type === TrackedCombatEntity.Token) {
        this.tokenSubscription = subscribeToToken(entityIdentifiers, {
          next: (token) => {
            this.token = token;
            if (token.actor !== this.actor) {
              this.actorUnsub?.();
              this.actorUnsub = token.actor?.subscribe(this.actorSub);
            }
          },
          complete: () => {
            this.token = null;
            this.tokenSubscription?.unsubscribe();
          },
        });
      } else if (entityIdentifiers?.type === TrackedCombatEntity.Actor) {
        this.actorUnsub?.();
        this.actorUnsub = findActor(entityIdentifiers)?.subscribe(
          this.actorSub,
        );
      }
    }
    super.update(changedProps);
  }

  private unsubFromAll() {
    this.tokenSubscription?.unsubscribe();
    this.actorUnsub?.();
  }

  private actorSub = (actor: ActorEP | null) => {
    this.actor = actor;
    if (!this.actor) this.actorUnsub?.();
  };

  get editable() {
    return (
      game.user.isGM ||
      (this.actor?.owner ??
        this.participant.userId === game.user.id)
    );
  }

  private openMenu() {
    if (!this.editable) return;
    const modifiedRoundActions = this.participant.modifiedTurn?.[this.round];
    openMenu({
      header: { heading: this.participant.name },
      content: compact([
        ...(this.actor?.proxy.type === ActorType.Character &&
        this.round
          ? [
              // TODO Use pools to modify action
              {
                label: localize('takeTheInitiative'),
                disabled: !!modifiedRoundActions?.tookInitiative || !!this.turn,
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
                disabled: modifiedRoundActions?.extraActions?.length === 2,
                callback: () => {
                  updateCombatState({
                    type: CombatActionType.UpdateParticipants,
                    payload: [
                      {
                        id: this.participant.id,
                        modifiedTurn: produce(
                          this.participant.modifiedTurn ?? {},
                          (draft) => {
                            const actions = draft[this.round]?.extraActions;
                            draft[this.round] = {
                              ...(draft[this.round] || {}),
                              extraActions:
                                actions?.length === 1
                                  ? [...actions, LimitedAction.Physical]
                                  : [LimitedAction.Physical],
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

  private async rollInitiative() {
    updateCombatState({
      type: CombatActionType.UpdateParticipants,
      payload: [await rollParticipantInitiative(this.participant)],
    });
  }

  private iconClick() {
    const token =
      this.token ??
      this.actor?.getActiveTokens(true)[0];
    if (token?.scene?.isView) {
      token.control({ releaseOthers: true });
      readyCanvas()?.animatePan({ x: token.x, y: token.y } as any);
    } else if (token) {
      notify(NotificationType.Info, "Token not on viewed scene")
    }
  }

  private openActorSheet() {
    this.actor?.sheet.render(true);
  }

  render() {
    const { participant } = this;
    const { editable, token, actor } = this;
    return html`
      <wl-list-item @contextmenu=${this.openMenu}>
        <mwc-icon-button
          slot="before"
          ?disabled=${!editable || !!(token && !token.scene?.isView)}
          @click=${this.iconClick}
          ><img
            src=${token?.data.img || actor?.data.img || CONST.DEFAULT_TOKEN}
        /></mwc-icon-button>
        <button
          class="name"
          ?disabled=${!editable || !actor}
          @click=${this.openActorSheet}
        >
          ${participant.name}
        </button>
        <span class="status">
          ${actor?.conditions.map(
            (condition) => html`
              <img
                src=${conditionIcons[condition]}
                title=${localize(condition)}
                height="14px"
              />
            `,
          )}
        </span>
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
