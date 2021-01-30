import {
  CombatActionType,
  CombatData,
  CombatParticipant,
  CombatRoundPhases,
  rollParticipantInitiative,
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
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  PropertyValues,
} from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
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

  private intObs: IntersectionObserver | null = null;

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

  async connectedCallback() {
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
                phase: RoundPhase.Normal,
                turn: [normalLength || 0],
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
                phase: RoundPhase.ExtraActions,
                turn: [extraLength || 0],
              };
            }
          }
        } while (!this.roundState);
        console.timeEnd('setupRoundState');
      }

      this.combatState = newState;
    });
    super.connectedCallback();
    this.intObs = new IntersectionObserver(
      (entries, observer) => {
        for (const entry of entries) {
          if (entry.intersectionRatio < 0.95) {
            entry.target.scrollIntoView({ behavior: 'smooth' });
          }
          observer.unobserve(entry.target);
        }
      },
      { root: this },
    );
  }

  disconnectedCallback() {
    this.combatState = null;
    this.unsub?.();
    this.unsub = null;
    this.intObs?.disconnect();
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues<this>) {
    requestAnimationFrame(() => {
      const active = this.renderRoot.querySelector('participant-item[active]');
      if (active) this.intObs?.observe(active);
    });
    super.updated(changedProps);
  }

  private advanceTurn() {
    const { phase = RoundPhase.Normal, turn = [] } = this.roundState ?? {};
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
    for (const nextPhase of [RoundPhase.Normal, RoundPhase.ExtraActions].filter(
      (n) => n > phase,
    )) {
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
        phase: RoundPhase.Normal,
        turn: [0],
      },
    });
  }

  private previousRound() {
    let turn = 0;
    let phase = RoundPhase.ExtraActions;
    const phases = setupPhases(this.participants, this.combatState!.round - 1);
    for (const newPhase of [RoundPhase.ExtraActions, RoundPhase.Normal]) {
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

  private async rollAllInitiatives() {
    const payload: { id: string; initiative: string }[] = [];
    for (const participant of this.participants) {
      if (participant.initiative == null) {
        payload.push(await rollParticipantInitiative(participant));
      }
    }
    if (notEmpty(payload)) {
      updateCombatState({
        type: CombatActionType.UpdateParticipants,
        payload,
      });
    }
  }

  render() {
    const { round = 0 } = this.combatState ?? {};
    const {
      [RoundPhase.Normal]: normal,
      [RoundPhase.ExtraActions]: extraActions,
      someTookInitiative,
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
    const noPrevTurn =
      round <= 1 &&
      (phase === RoundPhase.ExtraActions
        ? !normal?.length && !(turnIndex + extraIndex)
        : turnIndex === 0);
    return html`
      <header>
        ${isGM
          ? html`
              <mwc-icon-button
                @click=${this.rollAllInitiatives}
                ?disabled=${this.participants.every(
                  (p) => p.initiative != null,
                )}
                icon="casino"
              ></mwc-icon-button>
            `
          : ''}
        ${round ? html` <h2>${localize('round')} ${round}</h2> ` : ''}
        <sl-popover
          .renderOnDemand=${() =>
            html`<participant-selector></participant-selector>`}
        >
          <mwc-icon-button slot="base" icon="add"></mwc-icon-button>
        </sl-popover>
      </header>
      <div class="phases">
        ${notEmpty(normal)
          ? html`
              <sl-animated-list class="normal-order">
                ${someTookInitiative
                  ? html`<li class="label">
                      ${localize('took')} ${localize('initiative')}
                    </li>`
                  : ''}
                ${repeat(
                  normal,
                  ({ participant }) => participant.id,
                  ({ participant, tookInitiative }) =>
                    html`
                      <participant-item
                        class=${tookInitiative ? 'took-initiative' : ''}
                        .participant=${participant}
                        round=${round}
                        .limitedAction=${tookInitiative}
                        ?active=${phase === RoundPhase.Normal &&
                        activeParticipant === participant}
                        turn=${turnIndex}
                        ?hidden=${!isGM && !!participant.hidden}
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
                  ({ participant, limitedActions }) =>
                    limitedActions.map(
                      (limitedAction, actionIndex) => html`<participant-item
                        .participant=${participant}
                        limitedAction=${limitedAction}
                        round=${round}
                        ?active=${phase === RoundPhase.ExtraActions &&
                        participant === activeParticipant &&
                        actionIndex === extraIndex}
                        turn=${turnIndex}
                        ?hidden=${!isGM && !!participant.hidden}
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
                ?disabled=${round <= 1}
              ></mwc-icon-button>
              <mwc-icon-button
                @click=${this.previousTurn}
                icon="chevron_left"
                ?disabled=${noPrevTurn}
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
                ?disabled=${!editableActive || noPrevTurn}
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
}

declare global {
  interface HTMLElementTagNameMap {
    'combat-view': CombatView;
  }
}
