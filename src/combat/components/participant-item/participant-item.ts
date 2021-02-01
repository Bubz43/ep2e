import type { Dialog } from '@material/mwc-dialog';
import {
  CombatActionType,
  CombatParticipant,
  CombatPool,
  combatPools,
  rollParticipantInitiative,
  TrackedCombatEntity,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import type { ActorEP, MaybeToken } from '@src/entities/actor/actor';
import { ActorType } from '@src/entities/entity-types';
import { findActor } from '@src/entities/find-entities';
import { subscribeToToken } from '@src/entities/token-subscription';
import { conditionIcons } from '@src/features/conditions';
import { poolIcon } from '@src/features/pool';
import {
  createLiveTimeState,
  LiveTimeState,
  prettyMilliseconds,
} from '@src/features/time';
import { readyCanvas } from '@src/foundry/canvas';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { RenderDialogEvent } from '@src/open-dialog';
import { MenuOption, MWCMenuOption, openMenu } from '@src/open-menu';
import produce from 'immer';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import mix from 'mix-with/lib';
import { compact, equals } from 'remeda';
import type { Subscription } from 'rxjs';
import '../participant-editor/participant-editor';
import styles from './participant-item.scss';

@customElement('participant-item')
export class ParticipantItem extends mix(LitElement).with(UseWorldTime) {
  static get is() {
    return 'participant-item' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) participant!: CombatParticipant;

  @property({ type: Boolean, reflect: true }) active = false;

  @property({ type: Number }) round = 0;

  @property({ type: Number }) turn = 0;

  @property({ type: String }) tookInitiativePool?: CombatPool | null;

  @property({ type: String }) extraActionPool?: CombatPool | null;

  @internalProperty() private token?: MaybeToken;

  @internalProperty() private actor?: ActorEP | null;

  @internalProperty() private timeState?: LiveTimeState | null;

  private tokenSubscription?: Subscription | null;

  private actorUnsub?: (() => void) | null;

  disconnectedCallback() {
    this.unsubFromAll();
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues<this>) {
    if (
      changedProps.has('participant') &&
      !equals(
        (changedProps.get('participant') as CombatParticipant | undefined)
          ?.entityIdentifiers,
        this.participant.entityIdentifiers,
      )
    ) {
      this.unsubFromAll();
      this.timeState = null;
      const { entityIdentifiers } = this.participant;
      if (entityIdentifiers?.type === TrackedCombatEntity.Token) {
        this.tokenSubscription = subscribeToToken(entityIdentifiers, {
          next: (token) => {
            this.token = token;
            this.requestUpdate();
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
      } else if (entityIdentifiers?.type === TrackedCombatEntity.Time) {
        const { startTime, duration } = entityIdentifiers;
        this.timeState = createLiveTimeState({
          label: this.participant.name,
          id: this.participant.id,
          startTime,
          duration,
          updateStartTime: (newStartTime) => {
            updateCombatState({
              type: CombatActionType.UpdateParticipants,
              payload: [
                {
                  id: this.participant.id,
                  entityIdentifiers: {
                    type: TrackedCombatEntity.Time,
                    startTime: newStartTime,
                    duration,
                  },
                },
              ],
            });
          },
        });
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
    this.requestUpdate();
    if (!this.actor) this.actorUnsub?.();
  };

  get editable() {
    return (
      game.user.isGM ||
      (this.actor?.owner ?? this.participant.userId === game.user.id)
    );
  }

  private updateParticipant(change: Partial<CombatParticipant>) {
    updateCombatState({
      type: CombatActionType.UpdateParticipants,
      payload: [{ ...change, id: this.participant.id }],
    });
  }

  private get character() {
    return this.actor?.proxy.type === ActorType.Character
      ? this.actor.proxy
      : null;
  }

  private openMenu(ev: MouseEvent) {
    if (!this.editable) return;
    const { tookInitiative, extraActions } =
      this.participant.modifiedTurn?.[this.round] ?? {};
    const { character } = this;
    const pools = character?.pools;

    const content: MWCMenuOption[] = [];
    const delayOptions: MenuOption[] = [];
    const takeInitiativeOptions: MenuOption[] = [];
    const extraActionOptions: MenuOption[] = [];

    if (this.participant.delaying) {
      if (this.round !== -1) {
        delayOptions.push({
          label: localize('interrupt'),
          icon: html`<mwc-icon>priority_high</mwc-icon>`,
          callback: () => {
            this.dispatchEvent(
              new CustomEvent('interrupt-turn', {
                detail: this.participant,
                bubbles: true,
                composed: true,
              }),
            );
          },
        });
      }
      delayOptions.push({
        label: `[${localize('undo')}] ${localize('delayTurn')}`,
        callback: () => this.updateParticipant({ delaying: false }),
      });
    } else {
      delayOptions.push({
        label: localize('delayTurn'),
        callback: () => this.updateParticipant({ delaying: true }),
        disabled: !this.active,
      });
    }

    if (tookInitiative && this.turn === 0 && !this.extraActionPool) {
      takeInitiativeOptions.push({
        label: `[${localize('undo')}] ${localize(
          'takeTheInitiative',
        )} - ${localize(tookInitiative)}`,
        icon: html`<img src=${poolIcon(tookInitiative)} />`,
        callback: async () => {
          await character?.modifySpentPools({
            pool: tookInitiative,
            points: -1,
          });
          this.updateParticipant({
            modifiedTurn: produce(
              this.participant.modifiedTurn ?? {},
              (draft) => {
                draft[this.round] = {
                  ...(draft[this.round] ?? {}),
                  tookInitiative: null,
                };
              },
            ),
          });
        },
      });
    }

    if (pools && this.round && !this.participant.delaying) {
      for (const poolType of combatPools) {
        const pool = pools.get(poolType);
        if (!pool) continue;
        if (!tookInitiative) {
          takeInitiativeOptions.push({
            label: `${localize('takeTheInitiative')} - ${localize(
              pool.type,
            )} (${pool.available} / ${pool.max})`,
            icon: html`<img src=${pool.icon} />`,
            disabled: !pool.available || this.turn > 0,
            callback: async () => {
              await character?.modifySpentPools({
                pool: pool.type,
                points: 1,
              });
              this.updateParticipant({
                modifiedTurn: produce(
                  this.participant.modifiedTurn ?? {},
                  (draft) => {
                    draft[this.round] = {
                      ...(draft[this.round] ?? {}),
                      tookInitiative: poolType,
                    };
                  },
                ),
              });
            },
          });
        }

        if (!extraActions || extraActions.length === 1) {
          extraActionOptions.push({
            label: `${localize('extraAction')} - ${localize(pool.type)} (${
              pool.available
            }/${pool.max})`,
            icon: html`<img src=${pool.icon} />`,
            disabled: !pool.available,
            callback: async () => {
              await character?.modifySpentPools({
                pool: pool.type,
                points: 1,
              });
              this.updateParticipant({
                modifiedTurn: produce(
                  this.participant.modifiedTurn ?? {},
                  (draft) => {
                    draft[this.round] = {
                      ...(draft[this.round] ?? {}),
                      extraActions: extraActions?.[0]
                        ? [
                            extraActions[0],
                            { pool: poolType, id: !extraActions[0].id },
                          ]
                        : [{ pool: poolType, id: true }],
                    };
                  },
                ),
              });
            },
          });
        }
      }
    }

    if (extraActions) {
      extraActionOptions.push(
        ...extraActions.map(({ pool: poolType }, index) => ({
          label: `[${localize('undo')}] ${localize('extraAction')} ${
            index + 1
          } - ${localize(poolType)}`,
          icon: html`<img src=${poolIcon(poolType)} />`,
          callback: async () => {
            await character?.modifySpentPools({
              pool: poolType,
              points: -1,
            });
            const newActions = [...extraActions];
            newActions.splice(0, 1);
            this.updateParticipant({
              modifiedTurn: produce(
                this.participant.modifiedTurn ?? {},
                (draft) => {
                  draft[this.round] = {
                    ...(draft[this.round] ?? {}),
                    extraActions: newActions[0] ? [newActions[0]] : null,
                  };
                },
              ),
            });
          },
        })),
      );
    }

    for (const options of [
      delayOptions,
      takeInitiativeOptions,
      extraActionOptions,
    ]) {
      content.push(...options, 'divider');
    }

    openMenu({
      position: ev,
      header: { heading: this.participant.name },
      content: compact([
        ...content,
        character && {
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
    const token = this.token ?? this.actor?.getActiveTokens(true)[0];
    if (token?.scene?.isView) {
      token.control({ releaseOthers: true });
      readyCanvas()?.animatePan({ x: token.x, y: token.y } as any);
    } else if (token) {
      notify(NotificationType.Info, 'Token not on viewed scene');
    }
  }

  private openActorSheet() {
    this.actor?.sheet.render(true);
  }

  private openEditDialog() {
    this.dispatchEvent(
      new RenderDialogEvent(html`
        <mwc-dialog
          hideActions
          @participant-changed=${(
            ev: CustomEvent<Partial<CombatParticipant>> & {
              currentTarget: Dialog;
            },
          ) => {
            ev.currentTarget.close();
            updateCombatState({
              type: CombatActionType.UpdateParticipants,
              payload: [
                {
                  ...ev.detail,
                  id: this.participant.id,
                },
              ],
            });
          }}
          ><participant-editor
            .participant=${this.participant}
          ></participant-editor
        ></mwc-dialog>
      `),
    );
  }

  private get usedPool() {
    return this.extraActionPool || this.tookInitiativePool;
  }

  render() {
    const { participant, usedPool, editable, token, actor, timeState } = this;
    return html`
      <wl-list-item @contextmenu=${this.openMenu}>
        <mwc-icon-button
          slot="before"
          ?disabled=${!editable ||
          (!token && !actor) ||
          !!(token && !token.scene?.isView)}
          @click=${this.iconClick}
          ><img
            src=${participant.img ||
            token?.data.img ||
            actor?.data.img ||
            CONST.DEFAULT_TOKEN}
        /></mwc-icon-button>
        <button
          class="name"
          ?disabled=${!editable || !actor}
          @click=${this.openActorSheet}
        >
          ${participant.name}
        </button>
        <span class="status">
          ${usedPool ? html`[${localize(usedPool)}]` : ''}
          <span class="conditions">
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
          ${timeState
            ? html`
                <span class="time">
                  ${prettyMilliseconds(timeState.remaining)}
                  ${localize('remaining')}
                </span>
              `
            : ''}
        </span>

        <div class="actions" slot="after">
          ${participant.initiative != null
            ? html`
                <button
                  ?disabled=${!editable}
                  @click=${this.openEditDialog}
                  title=${participant.initiative}
                >
                  ${participant.delaying
                    ? `${localize('delay')}`
                    : participant.initiative}
                </button>
              `
            : html`
                <mwc-icon-button
                  @click=${this.rollInitiative}
                  ?disabled=${!editable}
                  ><img src="icons/svg/d20.svg"
                /></mwc-icon-button>
              `}
          <mwc-icon-button
            class="menu"
            icon="more_vert"
            @click=${this.openMenu}
          ></mwc-icon-button>
        </div>
      </wl-list-item>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-item': ParticipantItem;
  }
}
