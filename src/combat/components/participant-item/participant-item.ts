import type { Dialog } from '@material/mwc-dialog';
import {
  CombatActionType,
  CombatParticipant,
  CombatPool,
  combatPools,
  rollParticipantInitiative,
  RoundPhase,
  Surprise,
  TrackedCombatEntity,
  TurnModifiers,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { PoolType } from '@src/data-enums';
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
import { notEmpty } from '@src/utility/helpers';
import produce from 'immer';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import mix from 'mix-with/lib';
import { compact, equals, map } from 'remeda';
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

  @property({ type: Array }) extras?: CombatPool[] | null;

  @property({ type: Boolean }) surprise = false;

  @property({ type: Number }) phase!: RoundPhase;

  @property({ type: Boolean }) interruptExtra = false;

  @internalProperty() private token?: MaybeToken;

  @internalProperty() private actor?: ActorEP | null;

  @internalProperty() private timeState?: LiveTimeState | null;

  @internalProperty() private highlighted = false;

  private tokenSubscription?: Subscription | null;

  private actorUnsub?: (() => void) | null;

  disconnectedCallback() {
    // TODO highlight self on hoverToken
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
      Hooks.on('hoverToken', this.highligtToggle);
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

  private highligtToggle = (token: Token, highlight: boolean) => {
    if (token.uuid === this.token?.uuid) {
      this.highlighted = highlight;
    }
  };

  private unsubFromAll() {
    Hooks.off('hoverToken', this.highligtToggle);
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

  private toggleDelay() {
    if (this.participant.delaying) {
      this.dispatchEvent(
        new CustomEvent('interrupt-turn', {
          detail: this.participant,
          bubbles: true,
          composed: true,
        }),
      );
    } else
      this.dispatchEvent(
        new CustomEvent('delay', {
          detail: this.participant,
          bubbles: true,
          composed: true,
        }),
      );
  }

  private get turnModifiers() {
    return this.participant.modifiedTurn?.[this.round] ?? {};
  }

  private get canInterrupt() {
    return !!(
      this.participant.delaying &&
      this.turn !== -1 &&
      (this.phase !== RoundPhase.TookInitiative ||
        this.turnModifiers.tookInitiative)
    );
  }

  private modifyTurn(change: Partial<TurnModifiers>) {
    return produce(this.participant.modifiedTurn ?? {}, (draft) => {
      draft[this.round] = {
        ...(draft[this.round] ?? {}),
        ...change,
      };
    });
  }

  private openMenu(ev: MouseEvent) {
    if (!this.editable) return;
    const { tookInitiative, extraActions } = this.turnModifiers;
    const { character } = this;
    const pools = character?.pools;

    const content: MWCMenuOption[] = [];
    const delayOptions: MenuOption[] = [];
    const takeInitiativeOptions: MenuOption[] = [];
    const extraActionOptions: MenuOption[] = [];

    if (this.participant.delaying) {
      if (this.canInterrupt) {
        delayOptions.push({
          label: localize('interrupt'),
          icon: html`<mwc-icon>play_arrow</mwc-icon>`,
          callback: () => this.toggleDelay(),
        });
      }
      delayOptions.push({
        label: `[${localize('undo')}] ${localize('delayTurn')}`,
        callback: () =>
          this.updateParticipant({
            delaying: false,
            modifiedTurn: this.modifyTurn({ interruptExtra: false }),
          }),
      });
    } else {
      delayOptions.push({
        label: localize('delayTurn'),
        callback: () => this.toggleDelay(),
        icon: html`<mwc-icon>pause</mwc-icon>`,
        disabled: !this.canDelay,
      });
    }

    if (tookInitiative && this.turn <= 0 && !this.extras) {
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
            modifiedTurn: this.modifyTurn({ tookInitiative: null }),
          });
        },
      });
    }

    if (
      pools &&
      this.round &&
      (this.surprise ? this.participant.surprised !== Surprise.Surprised : true)
    ) {
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
                modifiedTurn: this.modifyTurn({ tookInitiative: poolType }),
              });
            },
          });
        }

        if (
          !this.participant.delaying &&
          (!extraActions || extraActions.length === 1)
        ) {
          extraActionOptions.push({
            label: `${localize('extraAction')} - ${localize(pool.type)} (${
              pool.available
            }/${pool.max})`,
            icon: html`<img src=${pool.icon} />`,
            disabled:
              !pool.available || (this.surprise && poolType === PoolType.Vigor),
            callback: async () => {
              await character?.modifySpentPools({
                pool: pool.type,
                points: 1,
              });
              this.updateParticipant({
                modifiedTurn: this.modifyTurn({
                  extraActions: extraActions?.[0]
                    ? [extraActions[0], poolType]
                    : [poolType],
                }),
              });
            },
          });
        }
      }
    }

    if (extraActions) {
      extraActionOptions.push(
        ...extraActions.map((poolType, index) => ({
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
              modifiedTurn: this.modifyTurn({
                extraActions: newActions[0] ? [newActions[0]] : null,
              }),
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
          icon: html`<mwc-icon>casino</mwc-icon>`,
        },
        {
          label: localize('edit'),
          callback: () => this.openEditDialog(),
          icon: html`<mwc-icon>edit</mwc-icon>`,
        },
        {
          label: localize('remove'),
          icon: html`<mwc-icon>remove</mwc-icon>`,
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
    this.updateParticipant(await rollParticipantInitiative(this.participant));
  }

  private openInitiativeMenu() {
    const bonus = this.character?.initiative;
    const baseLabel = bonus ? `1d6 + ${bonus}` : '1d6';
    openMenu({
      header: {
        heading: `${this.participant.name} - ${localize('roll')} ${localize(
          'initiative',
        )}`,
      },
      content: [
        {
          label: baseLabel,
          callback: () => this.rollInitiative(),
          icon: html`<mwc-icon>casino</mwc-icon>`,
        },
        {
          label: `${localize(
            Surprise.Surprised,
          )} (${baseLabel}) - 3, 🚫 ${localize('act')}/${localize('defend')}`,
          callback: async () =>
            this.updateParticipant(
              await rollParticipantInitiative(
                this.participant,
                Surprise.Surprised,
              ),
            ),
          icon: html`<mwc-icon>snooze</mwc-icon>`,
        },
        {
          label: `${localize(Surprise.Alerted)} (${baseLabel}) - 3, ${localize(
            'act',
          )}/${localize('defend')} ${localize('normally')}`,
          callback: async () =>
            this.updateParticipant(
              await rollParticipantInitiative(
                this.participant,
                Surprise.Alerted,
              ),
            ),
          icon: html`<mwc-icon>priority_high</mwc-icon>`,
        },
      ],
    });
  }

  private get activeToken() {
    return this.token ?? this.actor?.getActiveTokens(true)[0];
  }

  private iconClick() {
    const { activeToken } = this;
    if (activeToken?.scene?.isView) {
      activeToken.control({ releaseOthers: true });
      readyCanvas()?.animatePan({ x: activeToken.x, y: activeToken.y } as any);
    } else if (activeToken) {
      notify(NotificationType.Info, 'Token not on viewed scene');
    }
  }

  private hoveredToken?: Token | null;

  private hoverToken(ev: Event) {
    const { activeToken } = this;
    if (
      activeToken?.scene?.isView &&
      activeToken?.isVisible &&
      !activeToken._controlled
    ) {
      this.hoveredToken = activeToken;
      activeToken?._onHoverIn(ev, {});
    }
  }

  private unhoverToken(ev: Event) {
    if (this.hoveredToken) {
      this.hoveredToken._onHoverOut(ev);
      this.hoveredToken = null;
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

  private get usedPools() {
    return compact([this.extras, this.tookInitiativePool]).flat();
  }

  private toggleHidden() {
    this.updateParticipant({ hidden: !this.participant.hidden });
  }

  private toggleDefeated() {
    const defeated = !this.participant.defeated;
    this.updateParticipant({ defeated });
    const { activeToken } = this;
    if (!activeToken) return;
    const status = CONFIG.statusEffects.find(
      (e) => e.id === CONFIG.Combat.defeatedStatusId,
    );
    const effect =
      activeToken.actor && status ? status : CONFIG.controlIcons.defeated;
    activeToken.toggleEffect(effect, {
      overlay: true,
      active: defeated,
    });
  }

  private get canDelay() {
    return (
      !this.participant.delaying &&
      this.active &&
      this.phase !== RoundPhase.ExtraAction
    );
  }

  render() {
    const {
      participant,
      usedPools,
      editable,
      token,
      actor,
      timeState,
      character,
      canInterrupt,
      canDelay,
      highlighted,
    } = this;

    return html`
      <wl-list-item
        @contextmenu=${this.openMenu}
        class=${classMap({
          defeated: !!participant.defeated,
          hidden: !!participant.hidden,
          highlighted,
        })}
        @mouseenter=${this.hoverToken}
        @mouseleave=${this.unhoverToken}
      >
        <mwc-icon-button
          slot="before"
          ?disabled=${!editable ||
          (!token && !actor) ||
          !!(token && !token.scene?.isView)}
          @click=${this.iconClick}
          ><img
            class="icon"
            src=${participant.img ||
            token?.data.img ||
            actor?.data.img ||
            CONST.DEFAULT_TOKEN}
          />
          ${editable && character
            ? html`<notification-coin
                value=${character.activeDurations}
                ?actionRequired=${character.requiresAttention}
              ></notification-coin>`
            : ''}
        </mwc-icon-button>
        <button
          class="name"
          ?disabled=${!editable || !actor}
          @click=${this.openActorSheet}
        >
          ${this.surprise && participant.surprised
            ? html`<span class="surprise-label"
                >[${localize(participant.surprised)}]</span
              >`
            : ''}
          ${participant.name}
        </button>
        <span class="status">
          ${notEmpty(usedPools)
            ? html`<span class="used-pool"
                >[${map(usedPools, localize).join(', ')}]</span
              >`
            : this.interruptExtra
            ? html`<span class="extra-interrupt"
                >[${localize('interrupt')}]</span
              >`
            : ''}
          ${game.user.isGM
            ? html`
                <mwc-icon-button
                  class="mini-button ${participant.hidden ? 'active' : ''}"
                  @click=${this.toggleHidden}
                  icon="visibility_off"
                ></mwc-icon-button>
                <mwc-icon-button
                  class="mini-button defeat ${participant.defeated
                    ? 'active'
                    : ''}"
                  @click=${this.toggleDefeated}
                >
                  <img src="icons/svg/skull.svg" />
                </mwc-icon-button>
              `
            : ''}
          ${actor?.conditions.map(
            (condition) => html`
              <img
                src=${conditionIcons[condition]}
                title=${localize(condition)}
                height="14px"
              />
            `,
          )}
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
                  ?disabled=${!editable ||
                  (participant.delaying ? !canInterrupt : !canDelay)}
                  @click=${this.toggleDelay}
                  class=${canDelay ? 'can-delay' : ''}
                >
                  <span class="container">
                    ${participant.delaying
                      ? html`<mwc-icon title=${localize('interrupt')}
                          >play_arrow</mwc-icon
                        >`
                      : html`<span class="initiative"
                            >${participant.initiative}</span
                          >
                          ${canDelay
                            ? html`<mwc-icon class="pause">pause</mwc-icon>`
                            : ''} `}
                  </span>
                </button>
              `
            : html`
                <mwc-icon-button
                  @click=${this.round <= 1
                    ? this.openInitiativeMenu
                    : this.rollInitiative}
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
