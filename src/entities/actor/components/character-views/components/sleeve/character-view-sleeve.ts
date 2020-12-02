import type { Character } from '@src/entities/actor/proxies/character';
import type { Sleeve } from '@src/entities/actor/sleeves';
import { ActorType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import type { MovementRate } from '@src/features/movement';
import type { ReadonlyPool } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import { HealthType } from '@src/health/health';
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
    const { armor } = this.character;
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
      ${movement ? this.renderMovement(movement) : ''}
      ${!isInfomorph ||
      [ArmorType.Mental, ArmorType.Mesh].some((type) => armor.get(type))
        ? html` <sl-group label=${localize('armorRating')} class="armor-rating">
            ${isInfomorph
              ? ''
              : html`<span
                    class="physical-armor"
                    title="${localize('energy')} / ${localize('kinetic')}"
                  >
                    ${armor.get(ArmorType.Energy)} /
                    ${armor.get(ArmorType.Kinetic)},
                  </span>
                  <span
                    >${localize('layers')}
                    <span class="armor-value"
                      >${armor.get('layers')}</span
                    ></span
                  >`}
            ${[ArmorType.Mental, ArmorType.Mesh].map((type) => {
              const value = armor.get(type);
              return value
                ? html`<span
                    >${localize(type)}
                    <span class="armor-value">${value}</span></span
                  >`
                : '';
            })}
          </sl-group>`
        : ''}
      ${physicalHealth
        ? html` <health-item .health=${physicalHealth}> </health-item> `
        : ''}
      ${meshHealth
        ? html` <health-item .health=${meshHealth}>
            ${sleeve.type !== ActorType.Infomorph && sleeve.nonDefaultBrain
              ? html`
                  <span slot="source">${sleeve.nonDefaultBrain.name}</span>
                `
              : ''}
          </health-item>`
        : ''}
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

  private renderArmor() {
    return html``;
  }

  private renderMovement(movement: MovementRate[]) {
    return html``;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-sleeve': CharacterViewSleeve;
  }
}
