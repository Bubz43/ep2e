import {
  CombatActionType,
  TrackedCombatEntity,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { TabsMixin } from '@src/components/mixins/tabs-mixin';
import { readyCanvas } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html, PropertyValues } from 'lit-element';
import { live } from 'lit-html/directives/live';
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

  disconnectedCallback() {
      this.toAdd.clear();
      super.disconnectedCallback();
  }


  protected changeTab() {
      this.toAdd.clear();
      super.changeTab()
  }

  private toggleToAdd(entity: Actor | Token) {
    this.toAdd.delete(entity) || this.toAdd.add(entity);
    const submitButton = this.renderRoot.querySelector("submit-button");
    if (submitButton) submitButton.complete = notEmpty(this.toAdd)
  }

  private addToCombat() {
    if (notEmpty(this.toAdd)) {
      updateCombatState({
        type: CombatActionType.AddParticipants,
        payload: [...this.toAdd].map((entity) =>
          entity instanceof Token
            ? {
                name: entity.name,
                hidden: entity.data.hidden,
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
      this.toAdd.clear();
      this.requestUpdate()
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
      <mwc-list multi>
        ${[...game.actors.values()].map((actor) => {
          if (!actor.owner) return '';
          return html`
            <mwc-check-list-item
              graphic="medium"
              twoline
              @click=${() => this.toggleToAdd(actor)}
              ?selected=${live(this.toAdd.has(actor))}
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
      <mwc-list multi>
        ${readyCanvas()?.tokens?.placeables.map((token) => {
          if (!token.owner) return '';
          return html`
            <mwc-check-list-item
              graphic="medium"
              ?twoline=${!!token.actor}
              @click=${() => this.toggleToAdd(token)}
              ?selected=${live(this.toAdd.has(token))}
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
      ?complete=${live(notEmpty(this.toAdd))}
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
