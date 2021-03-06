import type { Ego } from '@src/entities/actor/ego';
import type { Character } from '@src/entities/actor/proxies/character';
import { idProp } from '@src/features/feature-helpers';
import { MotivationStance } from '@src/features/motivations';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { compact, prop } from 'remeda';
import {
  CharacterDrawerRenderer,
  CharacterDrawerRenderEvent,
} from '../../character-drawer-render-event';
import styles from './character-view-ego.scss';

@customElement('character-view-ego')
export class CharacterViewEgo extends LitElement {
  static get is() {
    return 'character-view-ego' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) ego!: Ego;

  private requestMentalHealthDrawer() {
    this.dispatchEvent(
      new CharacterDrawerRenderEvent(CharacterDrawerRenderer.MentalHealth),
    );
  }

  protected openHealthEditor() {
    this.character.openHealthEditor(this.ego.mentalHealth);
  }

  render() {
    const { filteredMotivations, settings } = this.ego;
    return html`
      <header>
        <button class="name" @click=${this.ego.openForm}>
          ${this.ego.name}
        </button>
        <span class="info">
          ${compact([
            `${this.ego.egoType} ${localize('ego')}`,
            this.ego.forkStatus &&
              `${localize(this.ego.forkStatus)} ${localize('fork')}`,
          ]).join(' • ')}
        </span>
        ${settings.trackPoints
          ? html`
              <sl-animated-list class="resource-points">
                ${repeat(
                  this.ego.points,
                  prop('point'),
                  ({ label, value }) => html`
                    <li>${label} <span class="value">${value}</span></li>
                  `,
                )}
              </sl-animated-list>
            `
          : ''}
      </header>

      ${this.ego.trackMentalHealth
        ? html`
            <health-item
              @click=${this.requestMentalHealthDrawer}
              @contextmenu=${this.openHealthEditor}
              clickable
              class="mental-health-view"
              .health=${this.ego.mentalHealth}
              ><span slot="source"
                >${localize('mentalHealth')}</span
              ></health-item
            >
          `
        : ''}
      ${notEmpty(filteredMotivations)
        ? html`
            <sl-animated-list class="motivations-list"
              >${repeat(
                filteredMotivations,
                idProp,
                this.renderMotivation,
              )}</sl-animated-list
            >
          `
        : ''}
    `;
  }

  private renderMotivation = (motivation: Ego['motivations'][number]) => {
    // TODO heal stress
    // TODO Show goals
    return html`
      <li class="motivation">
        <button>
          <mwc-icon class=${motivation.stance}
            >${motivation.stance === MotivationStance.Support
              ? 'add'
              : 'remove'}</mwc-icon
          >
          ${motivation.cause}
        </button>
        ${motivation.goals.length
          ? html`
              <notification-coin
                value=${motivation.goals.length}
              ></notification-coin>
            `
          : ''}
      </li>
    `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-ego': CharacterViewEgo;
  }
}
