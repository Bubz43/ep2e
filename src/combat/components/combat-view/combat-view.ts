import {
  CombatData,
  CombatParticipant,
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

  private participants = new Map<string, CombatParticipant>();

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
    this.unsub = gameSettings.combatState.subscribe((state) => {
      const changedPar = !equals(
        this.combatState?.participants,
        state.participants,
      );
      if (changedPar) {
        this.participants = new Map(
          Object.entries(state.participants).map(([id, data]) => {
            const { entityIdentifiers, ...part } = data;

            const token =
              entityIdentifiers?.type === TrackedCombatEntity.Token
                ? findToken(entityIdentifiers)
                : null;

            const participant: CombatParticipant = {
              ...part,
              id,
              token,
              actor:
                token?.actor ??
                (entityIdentifiers?.type === TrackedCombatEntity.Actor
                  ? findActor(entityIdentifiers)
                  : null),
            };
            return [id, participant] as const;
          }).sort(([_, a], [__, b]) => {
            if (a.initiative == null || b.initiative == null) {
              return a.name.localeCompare(b.name)
            }
            return Number(a.initiative) - Number(b.initiative);
          }) ,
        );
      }

      this.combatState = state;
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
    return html`
      <sl-animated-list>
        ${repeat(
          this.participants,
          first(),
          ([_, participant]) => html`
            <participant-item .participant=${participant}></participant-item>
          `,
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'combat-view': CombatView;
  }
}
