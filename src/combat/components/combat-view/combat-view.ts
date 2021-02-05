import {
  CombatActionType,
  CombatData,
  CombatParticipant,
  CombatRound,
  findViableParticipantTurn,
  rollParticipantInitiative,
  RoundPhase,
  setupCombatRound,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { openWindow } from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { localize } from '@src/foundry/localization';
import { gameSettings } from '@src/init';
import { nonNegative, notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  PropertyValues,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { equals, last } from 'remeda';
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

  private combatRound?: CombatRound | null;

  private activeTurn?: number;

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

      this.participants = newState.participants;

      if (newState.round !== combatState?.round) {
        this.combatRound = null;
      }

      const changedRound = changedParticipants || !this.combatRound;

      if (changedRound) {
        this.combatRound = setupCombatRound(this.participants, newState.round);
      }

      if (
        changedRound ||
        combatState?.turn !== newState.turn ||
        combatState.goingBackwards !== newState.goingBackwards ||
        combatState.skipDefeated !== newState.skipDefeated
      ) {
        const { turn, goingBackwards, skipDefeated = false } = newState;
        this.activeTurn = findViableParticipantTurn({
          participants: this.combatRound?.participants ?? [],
          startingTurn: nonNegative(turn),
          goingBackwards,
          skipDefeated,
          exhaustive: true,
          skipSurprised: !!this.combatRound?.surprise,
        });
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
    const goingBackwards = false;
    const turn = findViableParticipantTurn({
      participants: this.combatRound?.participants ?? [],
      skipDefeated: this.combatState?.skipDefeated ?? false,
      goingBackwards,
      exhaustive: false,
      startingTurn: (this.activeTurn ?? 0) + 1,
      skipSurprised: !!this.combatRound?.surprise,
    });

    if (turn >= 0) {
      updateCombatState({
        type: CombatActionType.UpdateRound,
        payload: {
          goingBackwards,
          round: this.combatState?.round ?? 0,
          turn,
        },
      });
    } else this.advanceRound();
  }

  private advanceRound() {
    const round = (this.combatState?.round || 0) + 1;
    const combatRound = setupCombatRound(this.participants, round);
    const goingBackwards = false;

    const turn = findViableParticipantTurn({
      participants: combatRound.participants,
      skipDefeated: this.combatState?.skipDefeated ?? false,
      goingBackwards,
      exhaustive: true,
      startingTurn: 0,
      skipSurprised: false,
    });

    updateCombatState({
      type: CombatActionType.UpdateRound,
      payload: { round, turn, goingBackwards },
    });
  }

  private rewindRound() {
    const round = (this.combatState?.round || 1) - 1;
    const combatRound = setupCombatRound(this.participants, round);
    const goingBackwards = true;

    const turn = findViableParticipantTurn({
      participants: combatRound.participants,
      skipDefeated: this.combatState?.skipDefeated ?? false,
      goingBackwards,
      exhaustive: true,
      startingTurn: combatRound.participants.length - 1,
      skipSurprised: false,
    });

    updateCombatState({
      type: CombatActionType.UpdateRound,
      payload: { round, turn, goingBackwards },
    });
  }

  private rewindTurn() {
    const goingBackwards = true;
    const turn = findViableParticipantTurn({
      participants: this.combatRound?.participants ?? [],
      skipDefeated: this.combatState?.skipDefeated ?? false,
      goingBackwards,
      exhaustive: false,
      startingTurn: (this.activeTurn ?? 0) - 1,
      skipSurprised: !!this.combatRound?.surprise,
    });

    if (turn >= 0) {
      updateCombatState({
        type: CombatActionType.UpdateRound,
        payload: {
          goingBackwards,
          round: this.combatState?.round ?? 0,
          turn,
        },
      });
    } else this.rewindRound();
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

  private applyInterrupt(ev: CustomEvent<CombatParticipant>) {
    const { activeParticipant } = this;
    if (!activeParticipant || activeParticipant.participant === ev.detail) {
      updateCombatState({
        type: CombatActionType.UpdateParticipants,
        payload: [{ id: ev.detail.id, delaying: false }],
      });
    } else {
      updateCombatState({
        type: CombatActionType.ApplyInterrupt,
        payload: {
          targetId: activeParticipant.participant.id,
          interrupterId: ev.detail.id,
          interruptExtra: !!activeParticipant.extras,
          interruptExtraInterrupter: !!activeParticipant.interruptExtra,
        },
      });
    }
  }

  private delayParticipant(ev: CustomEvent<CombatParticipant>) {
    const nextTurn = findViableParticipantTurn({
      participants: this.combatRound?.participants ?? [],
      skipDefeated: this.combatState?.skipDefeated ?? false,
      goingBackwards: false,
      exhaustive: false,
      startingTurn: (this.activeTurn ?? 0) + 1,
      skipSurprised: !!this.combatRound?.surprise,
    });
    console.log(nextTurn);
    updateCombatState({
      type: CombatActionType.DelayParticipant,
      payload: { participantId: ev.detail.id, advanceRound: nextTurn === -1 },
    });
  }

  private get activeParticipant() {
    return this.combatRound?.participants[this.activeTurn || -1];
  }

  private get log() {
    const { roundLogs = {}, round = -1 } = this.combatState ?? {};
    return roundLogs[round] ?? [];
  }

  render() {
    const { round = 0 } = this.combatState ?? {};
    const { isGM } = game.user;
    const { combatRound, activeTurn = -1, activeParticipant } = this;
    const { participants = [], someTookInitiative, surprise = false } =
      combatRound ?? {};
    const noPrevTurn = activeTurn < 0 || (round <= 1 && activeTurn <= 0);
    const phase = activeParticipant?.tookInitiative
      ? RoundPhase.TookInitiative
      : activeParticipant?.extras || activeParticipant?.interruptExtra
      ? RoundPhase.ExtraAction
      : RoundPhase.Normal;

    const logEntry = last(this.log);

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
        ${round
          ? html`
              <h2 class="round">
                ${surprise ? localize('surprise') : ''} ${localize('round')}
                ${surprise ? '' : round}
              </h2>
            `
          : ''}
        <sl-popover
          .renderOnDemand=${() =>
            html`<participant-selector></participant-selector>`}
        >
          <mwc-icon-button slot="base" icon="add"></mwc-icon-button>
        </sl-popover>
      </header>
      ${logEntry
        ? html`
            <sl-popover .renderOnDemand=${this.renderLog}>
              <wl-list-item
                class="last-log-entry"
                clickable
                slot="base"
                role="button"
                ><span>
                  <span>${logEntry.text}</span>
                  <time-since
                    timestamp=${logEntry.timestamp}
                  ></time-since> </span
              ></wl-list-item>
            </sl-popover>
          `
        : ''}

      <sl-animated-list
        class="combat-round"
        @interrupt-turn=${this.applyInterrupt}
        @delay=${this.delayParticipant}
      >
        ${someTookInitiative
          ? html`<li class="label">
              ${localize('took')} ${localize('initiative')}
            </li>`
          : ''}
        ${repeat(
          participants,
          ({ participant, extras }) => participant.id + (extras ? 'extra' : ''),
          (
            { participant, tookInitiative, extras, interruptExtra = false },
            index,
          ) => html`
            <participant-item
              class=${classMap({
                'took-initiative': !!tookInitiative,
                extra: !!(extras || interruptExtra),
              })}
              .participant=${participant}
              round=${round}
              ?active=${activeTurn === index}
              turn=${activeTurn}
              .tookInitiativePool=${tookInitiative}
              .phase=${phase}
              .extras=${extras}
              ?hidden=${!isGM && !!participant.hidden}
              ?surprise=${surprise}
              ?interruptExtra=${interruptExtra}
              data-extra-label="${localize('extra')} ${localize('actions')}"
            ></participant-item>
          `,
        )}
      </sl-animated-list>

      <footer>
        ${isGM
          ? html`
              <mwc-icon-button
                @click=${this.rewindRound}
                icon="arrow_backward"
                ?disabled=${round <= 1}
              ></mwc-icon-button>
              <mwc-icon-button
                @click=${this.rewindTurn}
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
                ?disabled=${!round || activeTurn === -1}
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
                @click=${this.rewindTurn}
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

  private renderLog = () => {
    return html`
      <ol class="log-entries">
        ${this.log.map(
          (entry) => html`<li>
            <time-since timestamp=${entry.timestamp}></time-since>
            <span>${entry.text}</span>
          </li>`,
        )}
      </ol>
    `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'combat-view': CombatView;
  }
}
