import {
  CombatData,
  CombatParticipant,
  CombatRoundPhases,
  LimitedAction,
  participantsByInitiative,
  RoundPhase,
  setupParticipants,
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

  // private participants = new Map<string, CombatParticipant>();

  // private tookInitiative = new Map<CombatParticipant, LimitedAction>();

  // private extraActions: {
  //   participant: CombatParticipant;
  //   limitedAction: LimitedAction;
  //   id: string;
  // }[] = [];

  private phases?: CombatRoundPhases;

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
      if (
        !this.phases ||
        !equals(combatState?.participants, newState.participants)
      ) {
        this.phases = setupParticipants(newState.participants, newState.round);
      }
      // const currentRound = combatState?.rounds[combatState.round];
      // const newRound = newState?.rounds[newState.round];
      // const roundChanged = combatState?.round !== newState.round;
      // if (
      //   changedParticipants ||
      //   roundChanged ||
      //   !equals(currentRound?.tookInitiative, newRound?.tookInitiative)
      // ) {
      //   this.tookInitiative = new Map(
      //     (newRound?.tookInitiative || [])
      //       .flatMap(({ participantId, limitedAction: type }) => {
      //         const participant = this.participants.get(participantId);
      //         if (!participant) return [];
      //         return [[participant, type]] as const;
      //       })
      //       .sort(([a], [b]) => participantsByInitiative(a, b)),
      //   );
      // }
      // if (
      //   changedParticipants ||
      //   roundChanged ||
      //   !equals(currentRound?.extraActions, newRound?.extraActions)
      // ) {
      //   this.extraActions = (newRound?.extraActions || [])
      //     .flatMap(({ participantId, limitedAction, id }) => {
      //       const participant = this.participants.get(participantId);
      //       if (!participant) return [];
      //       return [
      //         {
      //           participant,
      //           limitedAction: limitedAction,
      //           id,
      //         },
      //       ] as const;
      //     })
      //     .sort((a, b) =>
      //       participantsByInitiative(a.participant, b.participant),
      //     );
      // }

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

  render() {
    const round = this.combatState?.round || 0;
    const {
      [RoundPhase.TookInitiative]: tookInitiative,
      [RoundPhase.Normal]: normal,
      [RoundPhase.ExtraActions]: extraActions,
    } = this.phases ?? {};
    return html`
      ${notEmpty(tookInitiative)
        ? html`
            <sl-animated-list class="took-initiative">
              <li class="label">
                ${localize('took')} ${localize('initiative')}
              </li>
              ${repeat(
                tookInitiative,
                ([p]) => p.id,
                ([participant, limitedAction]) =>
                  html`
                    <participant-item
                      .participant=${participant}
                      limitedAction=${limitedAction}
                      round=${round}
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
                idProp,
                (participant) =>
                  html`
                    <participant-item
                      .participant=${participant}
                      round=${round}
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
                ([p, _, actionIndex]) => p.id + actionIndex,
                ([participant, limitedAction]) => html`
                  <participant-item
                    .participant=${participant}
                    limitedAction=${limitedAction}
                    round=${round}
                  ></participant-item>
                `,
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
