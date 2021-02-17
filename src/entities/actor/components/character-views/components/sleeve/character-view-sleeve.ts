import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { formattedSleeveInfo, Sleeve } from '@src/entities/actor/sleeves';
import { ActorType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { PoolItem } from '@src/features/components/pool-item/pool-item';
import { conditionIcons, ConditionType } from '@src/features/conditions';
import type { ReadonlyPool } from '@src/features/pool';
import { poolActionOptions } from '@src/features/pools';
import {
  createTemporaryMeasuredTemplate,
  placeMeasuredTemplate,
  readyCanvas,
} from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { userCan } from '@src/foundry/misc-helpers';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { clickIfEnter, notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import { customElement, html, LitElement, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { identity, sortBy } from 'remeda';
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

  @property({ attribute: false }) token?: Token | null;

  private viewConditions() {
    this.requestDrawer(CharacterDrawerRenderer.Conditions);
  }

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

  private async placeMovementPreviewTemplate(range: number) {
    const token = this.token || this.character.actor.getActiveTokens(true)[0];
    const center =
      token && token?.scene === readyCanvas()?.scene
        ? token.center
        : { x: 0, y: 0 };

    placeMeasuredTemplate(
      createTemporaryMeasuredTemplate({
        ...center,
        t: 'circle',
        distance: range,
      }),
      !!token,
    );
  }

  private toggleCondition(ev: Event) {
    if (ev.currentTarget instanceof HTMLElement) {
      const { condition } = ev.currentTarget.dataset;
      condition && this.character.toggleCondition(condition as ConditionType);
    }
  }

  private openPoolMenu(ev: MouseEvent) {
    if (ev.currentTarget instanceof PoolItem) {
      const { type } = ev.currentTarget.pool;
      openMenu({
        header: { heading: localize(type) },
        content: poolActionOptions(this.character, type),
        position: ev,
      });
    }
  }

  render() {
    const { sleeve } = this;
    const physicalHealth = 'physicalHealth' in sleeve && sleeve.physicalHealth;
    const meshHealth = 'activeMeshHealth' in sleeve && sleeve.activeMeshHealth;
    const {
      armor,
      movementRates,
      movementModifiers,
      conditions,
      pools,
      disabled,
      temporaryConditionSources,
    } = this.character;
    const canPlace = userCan('TEMPLATE_CREATE');
    return html`
      <header>
        <button class="name" @click=${this.sleeve.openForm}>
          ${this.sleeve.name}
        </button>
        <span class="info"> ${formattedSleeveInfo(sleeve).join(' • ')}</span>
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
              <sl-animated-list class="values">
                ${repeat(enumValues(ArmorType), identity, (type) => {
                  const value = armor.getClamped(type);
                  const reduced = armor.reducedArmors.has(type);
                  return value || reduced
                    ? html`<span class="rating ${classMap({ reduced })}"
                        ><img
                          src=${localImage('icons/armor/shield.svg')}
                          width="16"
                        />
                        <span class="label"> ${localize(type)}</span>
                        <span class="value">${value}</span></span
                      >`
                    : '';
                })}

                <span class="rating info"
                  >${localize('layers')}
                  <span class="value">${armor.layers}</span></span
                >
                ${armor.concealable
                  ? html`
                      <span class="rating info"
                        >${localize('concealable')}</span
                      >
                    `
                  : ''}
              </sl-animated-list>
            </div>
          `
        : ''}
      <div class="healths ${physicalHealth && meshHealth ? 'multiple' : ''}">
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
      </div>

      <div class="conditions">
        <mwc-button
          class="conditions-toggle"
          @click=${this.viewConditions}
          dense
          >${localize('conditions')}</mwc-button
        >
        <div class="conditions-list">
          ${enumValues(ConditionType).map(
            (condition) => html`
              <button
                ?disabled=${disabled}
                data-condition=${condition}
                @click=${this.toggleCondition}
                data-tooltip=${localize(condition)}
                @mouseover=${tooltip.fromData}
              >
                <img
                  src=${conditionIcons[condition]}
                  class=${conditions.includes(condition) ? 'active' : ''}
                  height="22px"
                />
                ${temporaryConditionSources.has(condition)
                  ? html`<notification-coin
                      value=${temporaryConditionSources.get(condition)
                        ?.length || 1}
                    ></notification-coin>`
                  : ''}
              </button>
            `,
          )}
        </div>
      </div>

      ${notEmpty(pools)
        ? html`
            <ul class="pools">
              ${[...pools.values()].map(this.renderPool)}
            </ul>
          `
        : ''}

      <div class="movement">
        ${(['encumbered', 'overburdened'] as const).map((mod) => {
          const val = movementModifiers[mod];
          return val ? html`<span class="mod">${localize(mod)}</span>` : '';
        })}
        ${notEmpty(movementRates)
          ? html`
              ${sortBy(movementRates, ({ type }) => localize(type).length).map(
                ({ type, base, full }) => html`
                  <span class="movement-rate"
                    >${localize(type)}
                    <span class="rate"
                      ><button
                        ?disabled=${!canPlace || !base}
                        @click=${() => this.placeMovementPreviewTemplate(base)}
                      >
                        ${base}
                      </button>
                      /
                      <button
                        ?disabled=${!canPlace || !full}
                        @click=${() => this.placeMovementPreviewTemplate(full)}
                      >
                        ${full}
                      </button></span
                    ></span
                  >
                `,
              )}
            `
          : ''}
      </div>
    `;
  }

  private renderPool = (pool: ReadonlyPool) => html`
    <pool-item
      @click=${this.openPoolMenu}
      .pool=${pool}
      ?disabled=${this.character.disabled}
      ?wide=${this.character.pools.size <= 2}
    ></pool-item>
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-sleeve': CharacterViewSleeve;
  }
}
