import {
  CombatActionType,
  TrackedCombatEntity,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { TabsMixin } from '@src/components/mixins/tabs-mixin';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import mix from 'mix-with/lib';
import styles from './participant-selector.scss';

@customElement('participant-selector')
export class ParticipantSelector extends mix(LitElement).with(
  TabsMixin(['actor', 'token', 'custom']),
) {
  static get is() {
    return 'participant-selector' as const;
  }

  static get styles() {
    return [styles];
  }

  private toAdd = new Set<Actor | Token>();

  private toggleToAdd(entity: Actor | Token) {
    this.toAdd.delete(entity) || this.toAdd.add(entity);
    this.requestUpdate();
  }

  private addToCombat() {
    if (notEmpty(this.toAdd)) {
      updateCombatState({
        type: CombatActionType.AddParticipants,
        payload: [...this.toAdd].map((entity) =>
          entity instanceof Token
            ? {
                name: entity.name,
                entityIdentifiers: entity.scene && {
                  type: TrackedCombatEntity.Token,
                  sceneId: entity.scene.id,
                  tokenId: entity.id,
                },
              }
            : {
                name: entity.name,
                entityIdentifiers: {
                  type: TrackedCombatEntity.Actor,
                  actorId: entity.id,
                },
              },
        ),
      });
    }
  }

  render() {
    return html`
      ${this.renderTabBar()} ${this.renderTabbedContent(this.activeTab)}
    `;
  }

  renderTabbedContent(tab: ParticipantSelector['tabs'][number]) {
    switch (tab) {
      case 'actor':
        return this.renderActors();
      case 'token':
        return this.renderTokens();
      case 'custom':
        return this.renderCustom();
    }
  }

  private renderActors() {
    return html`
      <mwc-list>
        ${[...game.actors.values()].map((actor) => {
          if (!actor.owner) return '';
          return html`
            <mwc-check-list-item
              graphic="medium"
              twoline
              ?selected=${this.toAdd.has(actor)}
              @click=${() => this.toggleToAdd(actor)}
            >
              <img slot="graphic" src=${actor.img} />
              <span>${actor.name}</span>
              <span slot="secondary">${localize(actor.type)}</span>
            </mwc-check-list-item>
          `;
        })}
      </mwc-list>
      ${this.renderSubmitButton()}
    `;
  }

  private renderTokens() {
    return html`
      <mwc-list>
        ${readyCanvas()?.tokens?.placeables.map((token) => {
          if (!token.owner) return '';
          return html`
            <mwc-check-list-item
              graphic="medium"
              ?twoline=${!!token.actor}
              ?selected=${this.toAdd.has(token)}
              @click=${() => this.toggleToAdd(token)}
            >
              <img slot="graphic" src=${token.data.img} />
              <span>${token.data.name}</span>
              ${token.actor
                ? html`
                    <span slot="secondary">${localize(token.actor.type)}</span>
                  `
                : ''}
            </mwc-check-list-item>
          `;
        })}
      </mwc-list>
      ${this.renderSubmitButton()}
    `;
  }

  private renderSubmitButton() {
    return html`<submit-button
      label=${localize('add')}
      ?complete=${notEmpty(this.toAdd)}
      @click=${this.addToCombat}
    ></submit-button>`;
  }

  private renderCustom() {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'participant-selector': ParticipantSelector;
  }
}
