import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Sleeve } from '@src/entities/actor/sleeves';
import { ActorType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { localize } from '@src/foundry/localization';
import { clickIfEnter, notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
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
    this.requestDrawer(CharacterDrawerRenderer.Armor);
  }

  private viewMeshHealth() {
    this.requestDrawer(CharacterDrawerRenderer.SleeveMeshHealth);
  }

  private viewPhysicalHealth() {
    this.requestDrawer(CharacterDrawerRenderer.SleevePhysicalHealth);
  }

  private requestDrawer(renderer: CharacterDrawerRenderer) {
    this.dispatchEvent(new CharacterDrawerRenderEvent(renderer));
  }

  render() {
    const { sleeve } = this;
    const physicalHealth = 'physicalHealth' in sleeve && sleeve.physicalHealth;
    const meshHealth = 'activeMeshHealth' in sleeve && sleeve.activeMeshHealth;
    const { armor, movementRates, movementModifiers } = this.character;
    return html`
      <header>
        <button class="name" @click=${this.sleeve.openForm}>
          ${this.sleeve.name}
        </button>
        <span class="info">
          ${compact([
            'size' in sleeve && localize(sleeve.size),
            sleeve.subtype || localize(sleeve.type),
            'isSwarm' in sleeve && sleeve.isSwarm && localize('swarm'),
            'sex' in sleeve && sleeve.sex,
          ]).join(' • ')}</span
        >
      </header>

      ${notEmpty(armor)
        ? html`
            <div
              class="armor"
              @click=${this.viewArmor}
              @keydown=${clickIfEnter}
              tabindex="0"
              role="button"
            >
              <img src=${localImage('icons/armor/shield.svg')} height="40px" />
       
              <div class="values">
                ${enumValues(ArmorType).map((type) => {
                  const value = armor.getClamped(type);
                  const reduced = armor.reducedArmoors.has(type);
                  return value || reduced
                    ? html`<span class="rating ${classMap({ reduced })}"
                        >${localize(type)}
                        <span class="value">${value}</span></span
                      >`
                    : '';
                })}
                <span class="rating info"
                  >${localize('layers')} <span class="value"
                    >${armor.get('layers')}</span
                  ></span
                >
                ${armor.concealable ? html`
                <span class="rating info">${localize("concealable")}</span>
                ` : ""}
              </div>
            </div>
          `
        : ''}
      ${physicalHealth
        ? html`
            <health-item
              @contextmenu=${() =>
                this.character.openHealthEditor(physicalHealth)}
              clickable
              @click=${this.viewPhysicalHealth}
              .health=${physicalHealth}
            >
            </health-item>
          `
        : ''}
      ${meshHealth
        ? html` <health-item
            @contextmenu=${() => this.character.openHealthEditor(meshHealth)}
            clickable
            @click=${this.viewMeshHealth}
            .health=${meshHealth}
          >
            ${sleeve.type !== ActorType.Infomorph && sleeve.nonDefaultBrain
              ? html`
                  <span slot="source">${sleeve.nonDefaultBrain.name}</span>
                `
              : ''}
          </health-item>`
        : ''}
      ${notEmpty(movementRates)
        ? html`
            <div class="movement">
              <span class="info">
                ${(['encumbered', 'overburdened'] as const).map((mod) => {
                  const val = movementModifiers[mod];
                  return val
                    ? html`<span class="mod">${localize(mod)}</span>`
                    : '';
                })}
              </span>
              ${movementRates.map(
                ({ type, base, full }) => html`
                  <span class="movement-rate"
                    >${localize(type)}
                    <span class="rate">${base} / ${full}</span></span
                  >
                `,
              )}
            </div>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-sleeve': CharacterViewSleeve;
  }
}
