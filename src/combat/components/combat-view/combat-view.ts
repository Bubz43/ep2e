import {
  CombatActionType,
  CombatData,
  CombatParticipant,
  CombatRoundPhases,
  RoundPhase,
  setupParticipants,
  setupPhases,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { openWindow } from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { localize } from '@src/foundry/localization';
import { gameSettings } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, internalProperty, LitElement } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { equals } from 'remeda';
import '../participant-item/participant-item';
import '../participant-selector/participant-selector';
import styles from './combat-view.scss';

@customElement('combat-view')
export class CombatView extends LitElement {
  static get is() {
    return 'combat-view' as const;
  }

  static get styles() {
    return [styles];
  }

  private unsub: (() => void) | null = null;

  @internalProperty() private combatState: CombatData | null = null;

  private participants: CombatParticipant[] = [];

  private phases?: CombatRoundPhases | null;

  private roundState?: Pick<CombatData, 'phase' | 'turn'> | null;

  static openWindow() {
    openWindow(
      {
        key: CombatView,
        name: localize('combat'),
        content: html`<combat-view></combat-view>`,
      },
      { resizable: ResizeOption.Vertical },
    );
  }

  connectedCallback() {
    this.unsub = gameSettings.combatState.subscribe((newState) => {
      const { combatState } = this;
      const changedParticipants = !equals(
        combatState?.participants,
        newState.participants,
      );
      if (changedParticipants) {
        console.time('setupParticipants');
        this.participants = setupParticipants(newState.participants);
        console.timeEnd('setupParticipants');
      }

      if (newState.round !== combatState?.round) {
        this.phases = null;
        this.roundState = null;
      }

      const changedPhases =
        changedParticipants ||
        !this.phases ||
        combatState?.round !== newState.round;

      if (changedPhases) {
        console.time('setupPhases');
        this.phases = setupPhases(this.participants, newState.round);
        console.timeEnd('setupPhases');
      }

      if (
        changedPhases ||
        combatState?.phase !== newState.phase ||
        !equals(combatState.turn, newState.turn)
      ) {
        const { phase, turn } = newState;
        const [turnIndex, extraActionIndex = 0] = turn;
        console.time('setupRoundState');
        do {
          if (phase === RoundPhase.ExtraActions) {
            const phaseData = this.phases?.[phase] ?? [];
            const active = phaseData[turnIndex];
            const extra = active?.limitedActions[extraActionIndex];
            if (extra) this.roundState = { phase, turn };
            else if (active) {
              this.roundState = { phase, turn: [turnIndex, 0] };
            } else {
              for (const change of [1, -1]) {
                const newIndex = turnIndex + change;
                const sibling = phaseData[newIndex];
                if (sibling) {
                  this.roundState = {
                    phase,
                    turn: [
                      newIndex,
                      (sibling.limitedActions.length - 1) as 1 | 0,
                    ],
                  };
                  break;
                }
              }
            }

            if (!this.roundState) {
              const normalLength = this.phases?.[RoundPhase.Normal].length;
              this.roundState = {
                phase: normalLength
                  ? RoundPhase.Normal
                  : RoundPhase.ExtraActions,
                turn: [
                  normalLength
                    ? normalLength - 1
                    : this.phases![RoundPhase.TookInitiative].length - 1,
                ],
              };
            }
          } else if (phase === RoundPhase.Normal) {
            for (const change of [0, 1, -1]) {
              const newIndex = turnIndex + change;
              const active = this.phases?.[phase][newIndex];
              if (active) {
                this.roundState = {
                  phase,
                  turn: [newIndex],
                };
                break;
              }
            }
            if (!this.roundState) {
              const extraLength = this.phases?.[RoundPhase.ExtraActions].length;
              this.roundState = {
                phase: extraLength
                  ? RoundPhase.ExtraActions
                  : RoundPhase.TookInitiative,
                turn: [
                  extraLength
                    ? 0
                    : this.phases![RoundPhase.TookInitiative].length - 1,
                ],
              };
            }
          } else if (phase === RoundPhase.TookInitiative) {
            for (const change of [0, 1, -1]) {
              const newIndex = turnIndex + change;
              const active = this.phases?.[phase][newIndex];
              if (active) {
                this.roundState = {
                  phase,
                  turn: [newIndex],
                };
                break;
              }
            }
            if (!this.roundState) {
              this.roundState = {
                phase: this.phases?.[RoundPhase.Normal].length
                  ? RoundPhase.Normal
                  : RoundPhase.ExtraActions,
                turn: [0],
              };
            }
          }
        } while (!this.roundState);
        console.timeEnd('setupRoundState');
      }

      this.combatState = newState;
    });
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.combatState = null;
    this.unsub?.();
    this.unsub = null;
    super.disconnectedCallback();
  }

  private advanceTurn() {
    const { phase = RoundPhase.TookInitiative, turn = [] } =
      this.roundState ?? {};
    const [turnIndex = 0, extraIndex = 0] = turn;
    if (phase === RoundPhase.ExtraActions && extraIndex !== 1) {
      const current = this.phases?.[phase][turnIndex];
      if (current?.limitedActions.length === 2) {
        updateCombatState({
          type: CombatActionType.UpdateRound,
          payload: {
            round: this.combatState?.round || 0,
            phase,
            turn: [turnIndex, 1],
          },
        });
        return;
      }
    }
    const next = this.phases?.[phase][turnIndex + 1];
    if (next) {
      updateCombatState({
        type: CombatActionType.UpdateRound,
        payload: {
          round: this.combatState?.round || 0,
          phase,
          turn: [turnIndex + 1],
        },
      });
      return;
    }
    for (const nextPhase of [
      RoundPhase.TookInitiative,
      RoundPhase.Normal,
      RoundPhase.ExtraActions,
    ].filter((n) => n > phase)) {
      const next = this.phases?.[nextPhase][0];
      if (next) {
        updateCombatState({
          type: CombatActionType.UpdateRound,
          payload: {
            round: this.combatState?.round || 0,
            phase: nextPhase,
            turn: [0],
          },
        });
        return;
      }
    }
    this.advanceRound();
  }

  private advanceRound() {
    updateCombatState({
      type: CombatActionType.UpdateRound,
      payload: {
        round: (this.combatState?.round || 0) + 1,
        phase: RoundPhase.TookInitiative,
        turn: [0],
      },
    });
  }

  private previousRound() {
    let turn = 0;
    let phase = RoundPhase.ExtraActions;
    const phases = setupPhases(this.participants, this.combatState!.round - 1);
    for (const newPhase of [
      RoundPhase.ExtraActions,
      RoundPhase.Normal,
      RoundPhase.TookInitiative,
    ]) {
      const turns = phases[newPhase];
      if (turns.length) {
        turn = turns.length - 1;
        phase = newPhase;
        break;
      }
    }
    updateCombatState({
      type: CombatActionType.UpdateRound,
      payload: {
        round: (this.combatState?.round || 1) - 1,
        phase,
        turn: [turn, 1],
      },
    });
  }

  private previousTurn() {
    const { phase = RoundPhase.ExtraActions, turn = [] } =
      this.roundState ?? {};
    const [turnIndex = 0, extraIndex = 0] = turn;
    if (phase === RoundPhase.ExtraActions && extraIndex === 1) {
      const current = this.phases?.[phase][turnIndex];
      if (current?.limitedActions.length === 2) {
        updateCombatState({
          type: CombatActionType.UpdateRound,
          payload: {
            round: this.combatState?.round || 0,
            phase,
            turn: [turnIndex, 0],
          },
        });
        return;
      }
    }
    const previous = this.phases?.[phase][turnIndex - 1];
    if (previous) {
      updateCombatState({
        type: CombatActionType.UpdateRound,
        payload: {
          round: this.combatState?.round || 0,
          phase,
          turn: [turnIndex - 1, 1],
        },
      });
      return;
    }
    for (const previousPhase of [
      RoundPhase.ExtraActions,
      RoundPhase.Normal,
      RoundPhase.TookInitiative,
    ].filter((n) => n < phase)) {
      const previous = this.phases?.[previousPhase];
      if (previous?.length) {
        updateCombatState({
          type: CombatActionType.UpdateRound,
          payload: {
            round: this.combatState?.round || 0,
            phase: previousPhase,
            turn: [previous.length - 1],
          },
        });
        return;
      }
    }
    this.previousRound();
  }

  private reset() {
    updateCombatState({
      type: CombatActionType.Reset,
    });
  }

  render() {
    const { round = 0 } = this.combatState ?? {};
    const {
      [RoundPhase.TookInitiative]: tookInitiative,
      [RoundPhase.Normal]: normal,
      [RoundPhase.ExtraActions]: extraActions,
    } = this.phases ?? {};
    const { phase, turn = [] } = this.roundState ?? {};
    const [turnIndex = 0, extraIndex = 0] = turn;
    const { isGM, id } = game.user;
    const activeParticipant =
      round && phase && this.phases?.[phase][turnIndex]?.participant;
    const editableActive =
      activeParticipant &&
      !!(
        isGM ||
        (activeParticipant.actor?.owner ?? activeParticipant.userId === id)
      );
    return html`
      <header>
        ${round ? html` <h2>${localize('round')} ${round}</h2> ` : ''}
        <sl-popover
          .renderOnDemand=${() =>
            html`<participant-selector></participant-selector>`}
        >
          <mwc-icon-button slot="base" icon="add"></mwc-icon-button>
        </sl-popover>
      </header>
      <div class="phases">
        ${notEmpty(tookInitiative)
          ? html`
              <sl-animated-list class="took-initiative">
                <li class="label">
                  ${localize('took')} ${localize('initiative')}
                </li>
                ${repeat(
                  tookInitiative,
                  ({ participant }) => participant.id,
                  ({ participant, limitedAction }) =>
                    html`
                      <participant-item
                        .participant=${participant}
                        limitedAction=${limitedAction}
                        round=${round}
                        ?active=${phase === RoundPhase.TookInitiative &&
                        participant === activeParticipant}
                        turn=${turnIndex}
                      ></participant-item>
                    `,
                )}
              </sl-animated-list>
            `
          : ''}
        ${notEmpty(normal)
          ? html`
              <sl-animated-list class="normal-order">
                ${repeat(
                  normal,
                  ({ participant }) => participant.id,
                  ({ participant }) =>
                    html`
                      <participant-item
                        .participant=${participant}
                        round=${round}
                        ?active=${phase === RoundPhase.Normal &&
                        activeParticipant === participant}
                        turn=${turnIndex}
                      ></participant-item>
                    `,
                )}
              </sl-animated-list>
            `
          : ''}
        ${notEmpty(extraActions)
          ? html`
              <sl-animated-list class="extra-actions">
                <li class="label">
                  ${localize('extra')} ${localize('actions')}
                </li>
                ${repeat(
                  extraActions,
                  ({ participant }) => participant.id,
                  ({ participant, limitedActions }, index) =>
                    limitedActions.map(
                      (limitedAction, actionIndex) => html`<participant-item
                        .participant=${participant}
                        limitedAction=${limitedAction}
                        round=${round}
                        ?active=${phase === RoundPhase.ExtraActions &&
                        participant === activeParticipant &&
                        actionIndex === extraIndex}
                        turn=${turnIndex}
                      ></participant-item>`,
                    ),
                )}
              </sl-animated-list>
            `
          : ''}
      </div>
      <footer>
        ${isGM
          ? html`
              <mwc-icon-button
                @click=${this.previousRound}
                icon="arrow_backward"
                ?disabled=${!round}
              ></mwc-icon-button>
              <mwc-icon-button
                @click=${this.previousTurn}
                icon="chevron_left"
                ?disabled=${!round}
              ></mwc-icon-button>
              <mwc-button
                dense
                @click=${round ? this.reset : this.advanceRound}
                ?disabled=${!round && this.participants.length === 0}
                >${localize(round ? 'end' : 'start')}
                ${localize('combat')}</mwc-button
              >
              <mwc-icon-button
                @click=${this.advanceTurn}
                icon="chevron_right"
                ?disabled=${!round}
              ></mwc-icon-button>
              <mwc-icon-button
                @click=${this.advanceRound}
                icon="arrow_forward"
                ?disabled=${!round}
              ></mwc-icon-button>
            `
          : round
          ? html`
              <mwc-icon-button
                @click=${this.previousTurn}
                icon="chevron_left"
                ?disabled=${!editableActive}
              ></mwc-icon-button>
              <mwc-button
                dense
                @click=${this.advanceTurn}
                ?disabled=${!editableActive}
              >
                ${localize('end')} ${localize('turn')}</mwc-button
              >
              <mwc-icon-button
                @click=${this.advanceTurn}
                icon="chevron_right"
                ?disabled=${!editableActive}
              ></mwc-icon-button>
            `
          : ''}
      </footer>
    `;
  }

  private renderSelector() {}
}

declare global {
  interface HTMLElementTagNameMap {
    'combat-view': CombatView;
  }
}
