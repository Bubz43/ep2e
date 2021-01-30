import {
  CombatActionType,
  CombatData,
  CombatParticipant,
  CombatRoundPhases,
  LimitedAction,
  participantsByInitiative,
  RoundPhase,
  setupParticipants,
  setupPhases,
  TrackedCombatEntity,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { openWindow } from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { findActor, findToken } from '@src/entities/find-entities';
import { localize } from '@src/foundry/localization';
import { gameSettings } from '@src/init';
import { customElement, html, internalProperty, LitElement } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { equals, first } from 'remeda';
import styles from './combat-view.scss';
import '../participant-item/participant-item';
import { notEmpty } from '@src/utility/helpers';
import { idProp } from '@src/features/feature-helpers';

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

  private roundState?: Pick<CombatData, 'phase' | 'turn'>;

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

      if (newState.started === false) this.phases = null;
      else {
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
                const extraLength = this.phases?.[RoundPhase.ExtraActions]
                  .length;
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
                    ? RoundPhase.ExtraActions
                    : RoundPhase.TookInitiative,
                  turn: [0],
                };
              }
            }
          } while (!this.roundState);
          console.timeEnd('setupRoundState');
        }
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

  render() {
    const round = this.combatState?.round || 0;
    const {
      [RoundPhase.TookInitiative]: tookInitiative,
      [RoundPhase.Normal]: normal,
      [RoundPhase.ExtraActions]: extraActions,
    } = this.phases ?? {};
    const { phase, turn = [] } = this.roundState ?? {};
    const [turnIndex, extraIndex] = turn;
    return html`
      ${notEmpty(tookInitiative)
        ? html`
            <sl-animated-list class="took-initiative">
              <li class="label">
                ${localize('took')} ${localize('initiative')}
              </li>
              ${repeat(
                tookInitiative,
                ({ participant }) => participant.id,
                ({ participant, limitedAction }, index) =>
                  html`
                    <participant-item
                      .participant=${participant}
                      limitedAction=${limitedAction}
                      round=${round}
                      ?active=${phase === RoundPhase.TookInitiative &&
                      index === turnIndex}
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
                ({ participant }, index) =>
                  html`
                    <participant-item
                      .participant=${participant}
                      round=${round}
                      ?active=${phase === RoundPhase.Normal &&
                      index === turnIndex}
                    ></participant-item>
                  `,
              )}
            </sl-animated-list>
          `
        : ''}
      ${notEmpty(extraActions)
        ? html`
            <sl-animated-list class="extra-actions">
              <li class="label">${localize('extra')} ${localize('actions')}</li>
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
                      index === turnIndex &&
                      actionIndex === extraIndex}
                    ></participant-item>`,
                  ),
              )}
            </sl-animated-list>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'combat-view': CombatView;
  }
}
