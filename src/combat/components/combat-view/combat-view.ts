import {
  CombatActionType,
  CombatData,
  CombatParticipant,
  CombatRoundPhases,
  rollParticipantInitiative,
  RoundPhase,
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
import { repeat } from 'lit-html/directives/repeat';
import { equals } from 'remeda';
import '../participant-item/participant-item';
import type { ParticipantItem } from '../participant-item/participant-item';
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

  @internalProperty() private playerTurnControls = false;

  private participants: CombatParticipant[] = [];

  private phases?: CombatRoundPhases | null;

  private roundState?: Pick<CombatData, 'phase' | 'phaseTurn'> | null;

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
        this.participants = newState.participants;
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
        !equals(combatState.phaseTurn, newState.phaseTurn)
      ) {
        const { phase, phaseTurn: turn = 0 } = newState;
        console.time('setupRoundState');
        if (phase === RoundPhase.Normal) {
          for (const change of [0, 1, -1]) {
            const newIndex = turn + change;
            const active = this.phases?.[phase][newIndex];
            if (active) {
              this.roundState = {
                phase,
                phaseTurn: newIndex,
              };
              break;
            }
          }
          if (!this.roundState) {
            const extraLength = this.phases?.[RoundPhase.ExtraActions].length;
            this.roundState = {
              phase: RoundPhase.ExtraActions,
              phaseTurn: extraLength || 0,
            };
          }
        } else if (phase === RoundPhase.ExtraActions) {
          for (const change of [0, 1, -1]) {
            const newIndex = turn + change;
            const active = this.phases?.[phase][newIndex];
            if (active) {
              this.roundState = {
                phase,
                phaseTurn: newIndex,
              };
              break;
            }
          }
          if (!this.roundState) {
            const normalLength = this.phases?.[RoundPhase.Normal].length;
            this.roundState = {
              phase: RoundPhase.Normal,
              phaseTurn: normalLength || 0,
            };
          }
        }
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
      const active = this.renderRoot.querySelector<ParticipantItem>(
        'participant-item[active]',
      );
      if (active) this.intObs?.observe(active);
      this.playerTurnControls = !game.user.isGM && !!active?.editable;
    });
    super.updated(changedProps);
  }

  private advanceTurn() {
    const { phase = RoundPhase.Normal, phaseTurn: turn = 0 } =
      this.roundState ?? {};

    const next = this.phases?.[phase][turn + 1];
    if (next) {
      updateCombatState({
        type: CombatActionType.UpdateRound,
        payload: {
          round: this.combatState?.round || 0,
          phase,
          phaseTurn: turn + 1,
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
            phaseTurn: 0,
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
        phaseTurn: 0,
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
        phaseTurn: turn,
      },
    });
  }

  private previousTurn() {
    const { phase = RoundPhase.ExtraActions, phaseTurn: turn = 0 } =
      this.roundState ?? {};

    const previous = this.phases?.[phase][turn - 1];
    if (previous) {
      updateCombatState({
        type: CombatActionType.UpdateRound,
        payload: {
          round: this.combatState?.round || 0,
          phase,
          phaseTurn: turn - 1,
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
            phaseTurn: previous.length - 1,
          },
        });
        return;
      }
    }
    this.previousRound();
  }

  private reset() {
    // TODO dialog
    updateCombatState({ type: CombatActionType.Reset });
  }

  private async rollAllInitiatives() {
    const payload: { id: string; initiative: number }[] = [];
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
    const { phase, phaseTurn: turn = 0 } = this.roundState ?? {};
    const { isGM } = game.user;

    const noPrevTurn =
      round <= 1 &&
      (phase === RoundPhase.ExtraActions ? !normal?.length : turn === 0);
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
              <sl-animated-list class="normal-order" transformOrigin="top">
                ${someTookInitiative
                  ? html`<li class="label">
                      ${localize('took')} ${localize('initiative')}
                    </li>`
                  : ''}
                ${repeat(
                  normal,
                  ({ participant }) => participant.id,
                  ({ participant, tookInitiative }, index) =>
                    html`
                      <participant-item
                        class=${tookInitiative ? 'took-initiative' : ''}
                        .participant=${participant}
                        round=${round}
                        ?active=${phase === RoundPhase.Normal && turn === index}
                        turn=${turn}
                        .tookInitiativePool=${tookInitiative}
                        ?hidden=${!isGM && !!participant.hidden}
                      ></participant-item>
                    `,
                )}
              </sl-animated-list>
            `
          : ''}
        ${notEmpty(extraActions)
          ? html`
              <sl-animated-list class="extra-actions" transformOrigin="top">
                <li class="label">
                  ${localize('extra')} ${localize('actions')}
                </li>
                ${repeat(
                  extraActions,
                  ({ participant, extra }) => participant.id+extra.id,
                  ({ participant, extra }, index) => html`
                    <participant-item
                      .participant=${participant}
                      round=${round}
                      ?active=${phase === RoundPhase.ExtraActions &&
                      turn === index}
                      turn=${turn}
                      .extraActionPool=${extra.pool}
                      ?hidden=${!isGM && !!participant.hidden}
                    ></participant-item>
                  `,
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
                ?disabled=${!this.playerTurnControls || noPrevTurn}
              ></mwc-icon-button>
              <mwc-button
                dense
                @click=${this.advanceTurn}
                ?disabled=${!this.playerTurnControls}
              >
                ${localize('end')} ${localize('turn')}</mwc-button
              >
              <mwc-icon-button
                @click=${this.advanceTurn}
                icon="chevron_right"
                ?disabled=${!this.playerTurnControls}
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
