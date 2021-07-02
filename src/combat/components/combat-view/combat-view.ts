import {
  CombatActionType,
  CombatData,
  CombatParticipant,
  CombatRound,
  findViableParticipantTurn,
  getParticipantEntities,
  rollParticipantInitiative,
  RoundPhase,
  setupCombatRound,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { renderLabeledCheckbox } from '@src/components/field/fields';
import { renderSubmitForm } from '@src/components/form/forms';
import { openWindow } from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { capitalize } from '@src/foundry/misc-helpers';
import { gameSettings } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { openMenu } from '@src/open-menu';
import { nonNegative, notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  LitElement,
  PropertyValues,
  state,
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

  @state() private combatState: CombatData | null = null;

  @state() private playerTurnControls = false;

  private participants: CombatParticipant[] = [];

  private combatRound?: CombatRound | null;

  private activeTurn?: number;

  private intObs: IntersectionObserver | null = null;

  static openWindow() {
    return openWindow(
      {
        key: CombatView,
        name: localize('combat'),
        content: html`<combat-view></combat-view>`,
      },
      { resizable: ResizeOption.Vertical },
    );
  }

  async connectedCallback() {
    if (!readyCanvas() && game.scenes.size) {
      await new Promise((resolve) => Hooks.on('canvasReady', resolve));
    }
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
    this.dispatchEvent(
      new RenderDialogEvent(html`
        <mwc-dialog heading="${localize('end')} ${localize('combat')}">
          <p>${localize('DESCRIPTIONS', 'EndCombat')}</p>
          <mwc-button slot="secondaryAction" dialogAction="cancel"
            >${localize('cancel')}</mwc-button
          >
          <mwc-button
            slot="primaryAction"
            dialogAction="confirm"
            unelevated
            @click=${() => updateCombatState({ type: CombatActionType.Reset })}
            >${localize('confirm')}</mwc-button
          >
        </mwc-dialog>
      `),
    );
  }

  private openRollInitiativeMenu() {
    openMenu({
      header: {
        heading: `${localize('roll')} ${localize('multiple')} ${localize(
          'initiatives',
        )}`,
      },
      content: [
        {
          label: localize('all'),
          callback: () => this.rollAllInitiatives(),
        },
        'divider',
        {
          label: localize('npcs'),
          callback: () => this.rollNPCInitiatives(),
        },
      ],
    });
  }

  private async rollNPCInitiatives() {
    const { players } = game.users;
    const participants = this.participants.filter((participant) => {
      const { actor } = getParticipantEntities(participant);
      return (
        !actor ||
        !players.some((user) => actor.testUserPermission(user, 'OWNER'))
      );
    });
    const payload: { id: string; initiative: number }[] = [];
    for (const participant of participants) {
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
    const {
      participants = [],
      someTookInitiative,
      surprise = false,
    } = combatRound ?? {};
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
                @click=${this.openRollInitiativeMenu}
                ?disabled=${this.participants.every(
                  (p) => p.initiative != null,
                )}
                icon="casino"
              ></mwc-icon-button>
            `
          : ''}

        <h2 class="round">
          ${round
            ? ` ${surprise ? localize('surprise') : ''}
                    ${capitalize(localize('turn'))} ${surprise ? '' : round}`
            : localize('preparation')}
        </h2>

        <sl-popover center .renderOnDemand=${this.renderParticipantSelector}>
          <mwc-icon-button slot="base" icon="add"></mwc-icon-button>
        </sl-popover>

        ${isGM
          ? html`
              <sl-popover center .renderOnDemand=${this.renderSettingsForm}>
                <mwc-icon-button icon="settings" slot="base"></mwc-icon-button>
              </sl-popover>
            `
          : ''}
      </header>
      ${logEntry
        ? html`
            <sl-popover .renderOnDemand=${this.renderLog}>
              <wl-list-item
                class="last-log-entry"
                clickable
                slot="base"
                role="button"
              >
                <span class="entry-text" title=${logEntry.text}
                  >${logEntry.text}</span
                >
                <time-since
                  slot="after"
                  timestamp=${logEntry.timestamp}
                ></time-since>
              </wl-list-item>
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

  private renderParticipantSelector = () =>
    html`<participant-selector></participant-selector>`;

  private renderSettingsForm = () => html`
    <sl-popover-section heading=${localize('settings')}
      >${renderSubmitForm({
        props: {
          skipDefeated: this.combatState?.skipDefeated ?? false,
        },
        update: (changed) =>
          updateCombatState({
            type: CombatActionType.UpdateSettings,
            payload: changed,
          }),
        fields: ({ skipDefeated }) => [renderLabeledCheckbox(skipDefeated)],
      })}</sl-popover-section
    >
  `;

  private renderLog = () => {
    return html`
      <ol class="log-entries">
        ${this.log.map(
          (entry) => html`<wl-list-item>
            <span>${entry.text}</span>
            <time-since slot="after" timestamp=${entry.timestamp}></time-since>
          </wl-list-item>`,
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
