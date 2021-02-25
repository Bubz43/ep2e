import { Placement } from '@src/components/popover/popover-options';
import { enumValues, RechargeType } from '@src/data-enums';
import { morphAcquisitionDetails } from '@src/entities/components/sleeve-acquisition';
import { ActorType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { conditionIcons, ConditionType } from '@src/features/conditions';
import { idProp } from '@src/features/feature-helpers';
import { MotivationStance } from '@src/features/motivations';
import type { ReadonlyPool } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import { userCan } from '@src/foundry/misc-helpers';
import { tooltip } from '@src/init';
import { clickIfEnter, notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import {
  customElement,
  html,
  internalProperty,
  property,
  TemplateResult,
} from 'lit-element';
import { nothing } from 'lit-html';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import { compact, difference, identity, prop, range, sortBy } from 'remeda';
import type { Ego } from '../../ego';
import type { Character } from '../../proxies/character';
import { formattedSleeveInfo, Sleeve } from '../../sleeves';
import { CharacterDrawerRenderer } from './character-drawer-render-event';
import styles from './character-view-alt.scss';
import { CharacterViewBase, ItemGroup } from './character-view-base';

type Detail = {
  label: string;
  value: string | number;
};
const tabs = ['actions', 'inventory', 'traits', 'details'] as const;

@customElement('character-view-alt')
export class CharacterViewAlt extends CharacterViewBase {
  static get is() {
    return 'character-view-alt' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @internalProperty() private currentTab: typeof tabs[number] = 'actions';

  private setTab(ev: CustomEvent<{ index: number }>) {
    this.currentTab = tabs[ev.detail.index] ?? 'actions';
  }

  private setDrawerRenderer(ev: Event) {
    const { renderer } = (ev.currentTarget as HTMLElement).dataset;
    this.toggleDrawerRenderer(renderer as CharacterDrawerRenderer);
  }

  render() {
    const { character } = this;
    const { ego, disabled, sleeve } = character;
    const { filteredMotivations, settings } = ego;
    const physicalHealth =
      sleeve && 'physicalHealth' in sleeve && sleeve.physicalHealth;
    const meshHealth =
      sleeve && 'activeMeshHealth' in sleeve && sleeve.activeMeshHealth;
    return html`
      <div class="ego">
        <button ?disabled=${disabled}>
          <img src=${character.img} height="62px" />
        </button>
        <h2 @click=${ego.openForm}>${character.name}</h2>
        <span class="info">
          ${compact([
            `${ego.egoType} ${localize('ego')}`,
            ego.forkStatus && `${localize(ego.forkStatus)} ${localize('fork')}`,
          ]).join(' • ')}
        </span>

        ${settings.trackPoints
          ? html`
              <sl-animated-list class="resource-points">
                ${repeat(
                  ego.points,
                  prop('point'),
                  ({ label, value }) => html`
                    <li>${label} <span class="value">${value}</span></li>
                  `,
                )}
              </sl-animated-list>
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
      </div>

      <div class="healths">
        ${settings.trackMentalHealth
          ? html` <health-item
              clickable
              class="mental-health-view"
              .health=${ego.mentalHealth}
              ><span slot="source">${localize('mental')}</span></health-item
            >`
          : ''}
        ${physicalHealth
          ? html`
              <health-item clickable .health=${physicalHealth}> </health-item>
            `
          : ''}
        ${meshHealth && sleeve
          ? html` <health-item clickable .health=${meshHealth}>
              ${sleeve.type !== ActorType.Infomorph && sleeve.nonDefaultBrain
                ? html`
                    <span slot="source">${sleeve.nonDefaultBrain.name}</span>
                  `
                : ''}
            </health-item>`
          : ''}
      </div>

      <div class="sleeve">
        ${sleeve ? this.renderSleeve(sleeve) : this.renderSleeveSelect()}
      </div>
      <character-view-test-actions
        class="actions"
        .character=${this.character}
        .ego=${this.character.ego}
      ></character-view-test-actions>

      <div class="tabbed-section">
        <mwc-tab-bar @MDCTabBar:activated=${this.setTab}>
          ${tabs.map(
            (tab) => html` <mwc-tab label=${localize(tab)}></mwc-tab> `,
          )}
        </mwc-tab-bar>
        <div class="tab-content">${cache(this.renderTabbedContent())}</div>
      </div>
      ${this.renderDrawer()} ${this.renderFooter()}
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

  private renderFooter() {
    const { conditions, disabled, temporaryConditionSources } = this.character;
    return html` <footer>
      ${this.renderActionIconButton({
        icon: 'search',
        tooltipText: localize('search'),
        renderer: CharacterDrawerRenderer.Search,
      })}
      ${this.renderActionIconButton({
        icon: 'access_time',
        tooltipText: localize('time'),
        renderer: CharacterDrawerRenderer.Time,
        content: this.character.activeDurations
          ? html`
              <notification-coin
                value=${this.character.activeDurations}
                ?actionRequired=${this.character.requiresAttention}
              ></notification-coin>
            `
          : undefined,
      })}
      ${this.renderActionIconButton({
        tooltipText: localize('substances'),
        renderer: CharacterDrawerRenderer.Substances,
        content: html`<img src=${localImage('icons/actions/medicines.svg')} />`,
      })}
      ${this.renderActionIconButton({
        icon: 'groups',
        tooltipText: localize('resleeve'),
        renderer: CharacterDrawerRenderer.Resleeve,
      })}
      ${this.renderActionIconButton({
        icon: 'wifi',
        tooltipText: `${localize('network')} ${localize('settings')}`,
        renderer: CharacterDrawerRenderer.NetworkSettings,
      })}
      ${this.character.poolHolder === this.character
        ? this.renderRecharges()
        : ''}

      <mwc-button
        class="effects-toggle"
        dense
        data-renderer=${CharacterDrawerRenderer.Effects}
        @click=${this.setDrawerRenderer}
      >
        ${localize('effects')}:
        <span class="total-effects"
          >${this.character.appliedEffects.total}</span
        >
      </mwc-button>

      <div class="conditions">
        <mwc-button
          class="conditions-toggle"
          dense
          @click=${this.setDrawerRenderer}
          data-renderer=${CharacterDrawerRenderer.Conditions}
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
      <sl-popover
        class="restore-popover"
        .closeEvents=${['trash-changed']}
        @trash-changed=${this.updateFromChange}
        placement=${Placement.Right}
        .renderOnDemand=${this.renderItemTrash}
      >
        <mwc-icon-button
          icon="restore_from_trash"
          class="restore-button"
          ?disabled=${!notEmpty(this.character.actor.itemTrash) ||
          this.character.disabled}
          slot="base"
        >
        </mwc-icon-button>
      </sl-popover>
    </footer>`;
  }

  private updateFromChange() {
    this.requestUpdate();
  }

  private renderRecharges() {
    const { activeRecharge, timeTillRechargeComplete } = this.character;
    return html` <button
      class="recharges"
      ?disabled=${this.character.disabled}
      data-renderer=${CharacterDrawerRenderer.Recharge}
      data-tooltip=${localize('recharge')}
      @click=${this.setDrawerRenderer}
      @mouseover=${tooltip.fromData}
      @focus=${tooltip.fromData}
    >
      ${Object.values(this.character.recharges).map(
        ({ type, taken, max }) => html`
          <div
            class="recharge ${classMap({
              active: activeRecharge?.rechargeType === type,
              ready: !timeTillRechargeComplete,
            })}"
          >
            <span class="recharge-type"
              >${localize(type === RechargeType.Short ? 'short' : 'long')}</span
            >
            ${range(0, max).map(
              (box) => html`
                <mwc-icon
                  >${taken > box
                    ? 'check_box'
                    : 'check_box_outline_blank'}</mwc-icon
                >
              `,
            )}
          </div>
        `,
      )}
    </button>`;
  }

  private renderActionIconButton({
    icon,
    tooltipText,
    renderer,
    content,
  }: {
    icon?: string | undefined;
    tooltipText: string;
    renderer: CharacterDrawerRenderer;
    content?: TemplateResult;
  }) {
    return html` <mwc-icon-button
      ?disabled=${this.character.disabled}
      data-tooltip=${tooltipText}
      icon=${ifDefined(icon)}
      @click=${this.setDrawerRenderer}
      @mouseenter=${tooltip.fromData}
      @focus=${tooltip.fromData}
      data-renderer=${renderer}
      >${content || ''}</mwc-icon-button
    >`;
  }

  private renderItemTrash = () => {
    return html` <item-trash .proxy=${this.character}></item-trash> `;
  };

  private renderTabbedContent() {
    switch (this.currentTab) {
      case 'actions':
        return html`
          <character-view-attacks-section
            .character=${this.character}
          ></character-view-attacks-section>
        `;

      case 'inventory':
        return html`
          ${repeat(
            difference(enumValues(ItemGroup), [ItemGroup.Traits]),
            identity,
            this.renderItemGroup,
          )}
        `;

      case 'traits':
        return this.renderItemGroup(ItemGroup.Traits);

      case 'details':
        return this.renderDetails();
    }
  }

  private renderSleeve(sleeve: Sleeve) {
    const { armor, movementRates, movementModifiers, pools } = this.character;
    const canPlace = userCan('TEMPLATE_CREATE');
    return html`
      <h3 @click=${sleeve.openForm}>${sleeve.name}</h3>
      <span class="info"> ${formattedSleeveInfo(sleeve).join(' • ')}</span>
      ${notEmpty(armor)
        ? html`
            <div
              class="armor"
              @click=${this.setDrawerRenderer}
              data-renderer=${CharacterDrawerRenderer.Armor}
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

                <span class="rating info">
                  <img
                    src=${localImage('icons/armor/layered-armor.svg')}
                    width="16"
                  />
                  <span class="label">${localize('layers')}</span>
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

  private renderSleeveSelect() {
    return html``;
  }

  private renderDetails() {
    const { ego, sleeve, psi } = this.character;
    // TODO sleeve details, sex, limbs, reach, acquisition
    const sleeveDetails: Detail[] | null | undefined =
      sleeve &&
      compact([
        ...morphAcquisitionDetails(sleeve.acquisition),
        'prehensileLimbs' in sleeve && {
          label: localize('prehensileLimbs'),
          value: sleeve.prehensileLimbs,
        },
      ]);
    return html`
      <sl-details open summary="${localize('ego')} - ${ego.name}">
        ${notEmpty(ego.details)
          ? html`
              <div class="details">${ego.details.map(this.renderDetail)}</div>
            `
          : ''}
        ${ego.description
          ? html` <enriched-html .content=${ego.description}></enriched-html> `
          : ''}
      </sl-details>

      ${psi
        ? html`
            <sl-details open summary="${localize('psi')} - ${psi.name}">
              ${psi.description
                ? html`
                    <enriched-html .content=${psi.description}></enriched-html>
                  `
                : ''}
            </sl-details>
          `
        : ''}
      ${sleeve
        ? html`
            <sl-details open summary="${localize('sleeve')} - ${sleeve.name}">
              ${notEmpty(sleeveDetails)
                ? html`
                    <div class="details">
                      ${sleeveDetails.map(this.renderDetail)}
                    </div>
                  `
                : ''}
              ${sleeve.description
                ? html`
                    <enriched-html
                      .content=${sleeve.description}
                    ></enriched-html>
                  `
                : ''}
            </sl-details>
          `
        : ''}
    `;
  }

  private renderDetail = ({ label, value }: Detail) => html` <span
    class="detail"
    >${label} <span class="value">${value}</span></span
  >`;

  private renderItemGroup = (group: ItemGroup) => {
    if (
      group === ItemGroup.Sleights &&
      !this.character.psi &&
      !this.character.sleights.length
    )
      return '';
    return html`
      <character-view-item-group
        .character=${this.character}
        group=${group}
        ?noCollapse=${group === ItemGroup.Traits}
        ?collapsed=${group === ItemGroup.Stashed}
      ></character-view-item-group>
    `;
  };

  protected renderDrawer() {
    const { drawerIsOpen } = this;
    return html`
      <focus-trap class="drawer ${classMap({ open: drawerIsOpen })}">
        ${drawerIsOpen
          ? html`
              ${this.renderDrawerContent()}
              <wl-list-item
                role="button"
                class="close-drawer"
                clickable
                @click=${this.closeDrawer}
                ><mwc-icon>close</mwc-icon></wl-list-item
              >
            `
          : nothing}
      </focus-trap>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-alt': CharacterViewAlt;
  }
}
