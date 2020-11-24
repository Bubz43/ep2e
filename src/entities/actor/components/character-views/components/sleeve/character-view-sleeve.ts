import type { Character } from '@src/entities/actor/proxies/character';
import type { Sleeve } from '@src/entities/actor/sleeves';
import type { ReadonlyPool } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { compact } from 'remeda';
import styles from './character-view-sleeve.scss';

@customElement('character-view-sleeve')
export class CharacterViewSleeve extends LitElement {
  static get is() {
    return 'character-view-sleeve' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) sleeve!: Sleeve;

  render() {
    const { sleeve } = this;
    const physicalHealth = 'physicalHealth' in sleeve && sleeve.physicalHealth;
    const meshHealth = 'activeMeshHealth' in sleeve && sleeve.activeMeshHealth;
    const movement = 'movementRates' in sleeve && sleeve.movementRates;
    const isInfomorph = !physicalHealth;
    return html`
      <header>
        <button @click=${this.sleeve.openForm}>${this.sleeve.name}</button>
        <span class="details">
          ${compact([
            'size' in sleeve && localize(sleeve.size),
            sleeve.subtype || localize(sleeve.type),
            'isSwarm' in sleeve && sleeve.isSwarm && localize('swarm'),
            'sex' in sleeve && sleeve.sex,
          ]).join(' • ')}</span
        >
      </header>

      ${compact([physicalHealth, meshHealth]).map(
        (health) => html` <health-item .health=${health}></health-item> `,
      )}
      ${notEmpty(this.character.pools)
        ? html`
            <ul class="pools">
              ${[...this.character.pools.values()].map(this.renderPool)}
            </ul>
          `
        : ''}
    `;
  }

  private renderPool = (pool: ReadonlyPool) => html`
    <pool-item
      .pool=${pool}
      ?disabled=${this.character.disabled || pool.disabled}
    ></pool-item>
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-sleeve': CharacterViewSleeve;
  }
}
