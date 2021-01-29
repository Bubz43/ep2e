import {
  CombatData,
  CombatParticipant,
  CombatState,
  TrackedCombatEntity,
} from '@src/combat/combat-tracker';
import { findActor, findToken } from '@src/entities/find-entities';
import { gameSettings } from '@src/init';
import { customElement, html, internalProperty, LitElement } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { first } from 'remeda';
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

  @internalProperty() private combatState!: CombatData;

  private participants = new Map<string, CombatParticipant>();

  connectedCallback() {
    this.unsub = gameSettings.combatState.listener((state) => {
      this.combatState = state;
      this.participants = new Map(
        Object.entries(state.participants).flatMap(([id, data]) => {
          if (!data) return [];
          const { entityIdentifiers, ...part } = data;
          const entity =
            entityIdentifiers?.type === TrackedCombatEntity.Actor
              ? findActor(entityIdentifiers)
              : entityIdentifiers?.type === TrackedCombatEntity.Token
              ? findToken(entityIdentifiers)
              : null;
          return [[id, { ...part, entity }]];
        }),
      );
    });
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.unsub?.();
    this.unsub = null;
    super.disconnectedCallback();
  }

  render() {
    return html` <sl-animated-list>
      ${repeat(this.participants, first, ([id, participant]) => html`
        <wl-list-item>
          <span>${participant.name}</span>
          <delete-button slot="after" @delete=${() => CombatState.removeParticipant(id)}></delete-button>
        </wl-list-item>
        `)}
       </sl-animated-list> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'combat-view': CombatView;
  }
}
