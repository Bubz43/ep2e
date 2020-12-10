import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Sleeve } from '@src/entities/actor/sleeves';
import { ActorType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import type { ReadonlyPool } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import { clickIfEnter, notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { compact } from 'remeda';
import {
  CharacterDrawerRenderer,
  CharacterDrawerRenderEvent,
} from '../../character-drawer-render-event';
import styles from './character-view-sleeve.scss';

@customElement('character-view-sleeve')
export class CharacterViewSleeve extends LitElement {
  static get is() {
    return 'character-view-sleeve' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) sleeve!: Sleeve;

  private viewArmor() {
    this.requestDrawer(CharacterDrawerRenderer.Armor)
  }

  private viewMeshHealth() {
    this.requestDrawer(CharacterDrawerRenderer.SleeveMeshHealth)
  }

  private viewPhysicalHealth() {
    this.requestDrawer(CharacterDrawerRenderer.SleevePhysicalHealth)
  }

  private requestDrawer(renderer: CharacterDrawerRenderer) {
    this.dispatchEvent(new CharacterDrawerRenderEvent(renderer))
  }

  render() {
    const { sleeve } = this;
    const physicalHealth = 'physicalHealth' in sleeve && sleeve.physicalHealth;
    const meshHealth = 'activeMeshHealth' in sleeve && sleeve.activeMeshHealth;
    const { armor, movementRates, movementModifiers } = this.character;
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

      <div
        class="armor"
        @click=${this.viewArmor}
        @keydown=${clickIfEnter}
        tabindex="0"
        role="button"
      >
        <span class="label"
          >${localize('armorRating')}
          <span class="layers">
            ${armor.get('layers')} ${localize('layers')}</span
          ></span
        >
        <span class="info">
          ${armor.concealable
            ? html`<span>${localize('concealable')}</span>`
            : ''}
        </span>
        <span class="values"
          >${enumValues(ArmorType).map((type) => {
            const value = armor.getClamped(type);
            const reduced = armor.reducedArmoors.has(type);
            return value || reduced
              ? html`<span class="rating ${classMap({ reduced })}"
                  >${localize(type)} <span class="value">${value}</span></span
                >`
              : '';
          })}</span
        >
      </div>

      ${notEmpty(movementRates)
        ? html`
            <div class="movement">
              <span class="label">${localize('movement')}</span>
              <span class="info">
                ${(['encumbered', 'overburdened'] as const).map((mod) => {
                  const val = movementModifiers[mod];
                  return val ? localize(mod) : '';
                })}
              </span>
              <div class="rates">
                ${movementRates.map(
                  ({ type, base, full }) => html`
                    <span class="movement-rate"
                      >${localize(type)}
                      <span class="rate">${base} / ${full}</span></span
                    >
                  `,
                )}
              </div>
            </div>
          `
        : ''}
      ${physicalHealth
        ? html` <health-item clickable @click=${this.viewPhysicalHealth} .health=${physicalHealth}> </health-item> `
        : ''}
      ${meshHealth
        ? html` <health-item clickable @click=${this.viewMeshHealth} .health=${meshHealth}>
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
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-sleeve': CharacterViewSleeve;
  }
}
