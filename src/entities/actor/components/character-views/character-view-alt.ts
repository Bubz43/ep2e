import {
  CombatActionType,
  rollInitiative,
  Surprise,
  TrackedCombatEntity,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { Placement } from '@src/components/popover/popover-options';
import { enumValues, RechargeType } from '@src/data-enums';
import { morphAcquisitionDetails } from '@src/entities/components/sleeve-acquisition';
import { ActorType } from '@src/entities/entity-types';
import { ArmorType } from '@src/features/active-armor';
import { conditionIcons, ConditionType } from '@src/features/conditions';
import { idProp } from '@src/features/feature-helpers';
import { MotivationStance } from '@src/features/motivations';
import { localize } from '@src/foundry/localization';
import { userCan } from '@src/foundry/misc-helpers';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { clickIfEnter, notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import {
  customElement,
  html,
  internalProperty,
  property,
  PropertyValues,
  TemplateResult,
} from 'lit-element';
import { nothing } from 'lit-html';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import {
  compact,
  difference,
  identity,
  noop,
  prop,
  range,
  sortBy,
} from 'remeda';
import type { Ego } from '../../ego';
import type { Character } from '../../proxies/character';
import { formattedSleeveInfo } from '../../sleeves';
import { CharacterDrawerRenderer } from './character-drawer-render-event';
import styles from './character-view-alt.scss';
import { CharacterViewBase, ItemGroup } from './character-view-base';

type Detail = {
  label: string;
  value: string | number;
};
const tabs = [
  'tests',
  'gear',
  'combat',
  'traits',
  'sleights',
  'details',
] as const;

type CharacterTab = typeof tabs[number];

@customElement('character-view-alt')
export class CharacterViewAlt extends CharacterViewBase {
  static get is() {
    return 'character-view-alt' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @property({ type: Boolean, reflect: true }) compact = false;

  @internalProperty() private currentTab: CharacterTab = 'combat';

  update(changedProps: PropertyValues<this>) {
    if (
      changedProps.has('compact') &&
      this.currentTab === 'tests' &&
      !this.compact
    ) {
      this.currentTab = 'gear';
    }
    super.update(changedProps);
  }

  private get currentTabs() {
    return difference(
      tabs,
      compact([
        !this.compact && 'tests',
        !this.character.psi && !this.character.hasSleights && 'sleights',
      ]),
    );
  }

  private setTab(ev: CustomEvent<{ index: number }>) {
    this.currentTab = this.currentTabs[ev.detail.index] ?? 'combat';
  }

  private setDrawerRenderer(ev: Event) {
    const { renderer } = (ev.currentTarget as HTMLElement).dataset;
    this.toggleDrawerRenderer(renderer as CharacterDrawerRenderer);
  }

  private addToCombat(initiative?: number, surprised?: Surprise) {
    const name = this.token?.name ?? this.character.name;
    const hidden = this.token?.data.hidden;
    updateCombatState({
      type: CombatActionType.AddParticipants,
      payload: [
        {
          name,
          hidden,
          initiative,
          surprised,
          entityIdentifiers: this.token?.scene
            ? {
                type: TrackedCombatEntity.Token,
                tokenId: this.token.id,
                sceneId: this.token.scene.id,
              }
            : {
                type: TrackedCombatEntity.Actor,
                actorId: this.character.actor.id,
              },
        },
      ],
    });
  }

  private openInitiativeMenu() {
    const bonus = this.character?.initiative;
    const baseLabel = bonus ? `1d6 + ${bonus}` : '1d6';
    const name = this.token?.name ?? this.character.name;
    const hidden = this.token?.data.hidden;
    const roll = async (surprise?: Surprise) => {
      const result = await rollInitiative(
        { token: this.token, actor: this.character.actor },
        {
          surprised: surprise,
          name,
          hidden,
        },
      );
      this.addToCombat(result.initiative, surprise);
    };
    openMenu({
      content: [
        {
          label: `${localize('add')} ${localize('to')} ${localize('combat')}`,
          callback: () => this.addToCombat(),
          icon: html`<mwc-icon>add</mwc-icon>`,
        },
        {
          label: `${localize('add')} & ${localize('roll')} ${baseLabel}`,
          callback: () => roll(),
          icon: html`<mwc-icon>casino</mwc-icon>`,
        },
        {
          label: `${localize(
            Surprise.Surprised,
          )} (${baseLabel}) - 3, 🚫 ${localize('act')}/${localize('defend')}`,
          callback: () => roll(Surprise.Surprised),
          icon: html`<mwc-icon>snooze</mwc-icon>`,
        },
        {
          label: `${localize(Surprise.Alerted)} (${baseLabel}) - 3, ${localize(
            'act',
          )}/${localize('defend')} ${localize('normally')}`,
          callback: () => roll(Surprise.Alerted),
          icon: html`<mwc-icon>priority_high</mwc-icon>`,
        },
      ],
    });
  }

  private rollStress() {
    this.character.ego.rollStress();
  }

  render() {
    const { character, currentTabs } = this;
    const { psi } = character;
    return html`
      ${this.renderHeader()}
      ${psi
        ? html`<character-view-psi
            .character=${this.character}
            .psi=${psi}
          ></character-view-psi>`
        : ''}
      ${this.compact
        ? ''
        : html`<character-view-test-actions
            class="actions"
            .character=${this.character}
            .ego=${this.character.ego}
          ></character-view-test-actions>`}

      <div class="tabbed-section">
        <mwc-tab-bar
          @MDCTabBar:activated=${this.setTab}
          activeIndex=${currentTabs.findIndex((t) => t === this.currentTab)}
        >
          ${currentTabs.map(
            (tab: CharacterTab) =>
              html`
                <mwc-tab
                  @dragenter=${tab === 'combat' || tab === 'details'
                    ? noop
                    : this.activateTab}
                  label=${localize(tab)}
                ></mwc-tab>
              `,
          )}
        </mwc-tab-bar>
        <div class="tab-content">${cache(this.renderTabbedContent())}</div>
      </div>
      ${this.renderDrawer()} ${this.renderFooter()}
    `;
  }

  private renderInitiativeButton() {
    return html`<mwc-button
      dense
      class="initiative"
      @click=${this.openInitiativeMenu}
      ?disabled=${this.character.disabled}
    >
      ${localize('initiative')}: ${this.character.initiative}
    </mwc-button>`;
  }

  private renderHeader() {
    const {
      ego,
      sleeve,
      pools,
      disabled,
      armor,
      img,
      movementRates,
      movementModifiers,
    } = this.character;
    const { filteredMotivations, settings } = ego;
    const physicalHealth =
      sleeve && 'physicalHealth' in sleeve && sleeve.physicalHealth;
    const meshHealth =
      sleeve && 'activeMeshHealth' in sleeve && sleeve.activeMeshHealth;
    const canPlace = userCan('TEMPLATE_CREATE');

    return html`<div class="header">
      <div class="main-entities">
        <div class="avatar">
          <img src=${img} width="84px" />
        </div>

        <div class="entities">
          <div class="ego-entity">
            <button class="entity-name">
              <span @click=${ego.openForm}>${ego.name}</span>
            </button>
            <span class="info">
              ${compact([
                `${ego.egoType} ${localize('ego')}`,
                ego.forkStatus &&
                  `${localize(ego.forkStatus)} ${localize('fork')}`,
              ]).join(' • ')}
            </span>
            ${this.compact ? this.renderInitiativeButton() : ''}
          </div>

          <div class="sleeve-entity">
            <button class="entity-name" @click=${sleeve?.openForm}>
              ${sleeve?.name || `${localize('add')} ${localize('sleeve')}`}
            </button>
            ${sleeve
              ? html`
                  <span class="info">
                    ${formattedSleeveInfo(sleeve).join(' • ')}</span
                  >
                `
              : ''}
          </div>
        </div>

        <div class="combo-extras">
          <div class="buttons">
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
            ${this.character.ego.hasStressRoll
              ? html`
                  <mwc-button
                    class="stress-roll"
                    dense
                    slot="action"
                    label="${localize('SHORT', 'stressValue')}: ${this.character
                      .ego.stressValueInfo.value}"
                    @click=${this.rollStress}
                  ></mwc-button>
                `
              : ''}
            ${this.compact ? '' : this.renderInitiativeButton()}
          </div>
          ${notEmpty(pools)
            ? html`
                <ul class="pools">
                  ${[...pools.values()].map(
                    // pools.size <= 1
                    //   ? this.renderPool
                    //   :
                    (pool) => html` <li
                      class="pool"
                      tabindex=${disabled ? '-1' : 0}
                      role="button"
                      data-pool=${pool.type}
                      data-tooltip=${localize(pool.type)}
                      @mouseover=${tooltip.fromData}
                      @focus=${tooltip.fromData}
                      @click=${this.openPoolMenu}
                      ?disabled=${disabled}
                    >
                      <img height="22px" src=${pool.icon} />
                      <span></span>
                      <!-- <span> ${localize(pool.type)} </span> -->
                      <value-status
                        value=${pool.available}
                        max=${pool.max}
                      ></value-status>
                    </li>`,
                  )}
                </ul>
              `
            : ''}
        </div>
      </div>

      <div class="extras">
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
        ${sleeve?.type === ActorType.Synthetic && sleeve.hasPainFilter
          ? html`
              <mwc-formfield label=${localize('painFilter')} class="pain-filter"
                ><mwc-switch
                  ?disabled=${disabled}
                  ?checked=${sleeve.painFilterActive}
                  @change=${() => sleeve.togglePainFilter()}
                ></mwc-switch
              ></mwc-formfield>
            `
          : ''}
      </div>
      <div class="armor-movement">
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
                        <span class="rating info concealable"
                          >${localize('concealable')}</span
                        >
                      `
                    : ''}
                </sl-animated-list>
              </div>
            `
          : ''}

        <div class="movement">
          ${(['encumbered', 'overburdened'] as const).map((mod) => {
            const val = movementModifiers[mod];
            return val ? html`<span class="mod">${localize(mod)}</span>` : '';
          })}
          ${notEmpty(movementRates)
            ? html`
                ${sortBy(
                  movementRates,
                  ({ type }) => localize(type).length,
                ).map(
                  ({ type, base, full, skill }) => html`
                    <span
                      class="movement-rate"
                      title=${`${localize('use')} ${skill}`}
                      >${localize(type)}
                      <span class="rate"
                        ><button
                          ?disabled=${!canPlace || !base}
                          @click=${() =>
                            this.placeMovementPreviewTemplate(base)}
                        >
                          ${base}
                        </button>
                        /
                        <button
                          ?disabled=${!canPlace || !full}
                          @click=${() =>
                            this.placeMovementPreviewTemplate(full)}
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
      </div>
      <div class="main-healths">
        ${settings.trackMentalHealth
          ? html` <health-item
              clickable
              data-renderer=${CharacterDrawerRenderer.MentalHealth}
              @click=${this.setDrawerRenderer}
              class="mental-health-view"
              .health=${ego.mentalHealth}
              ><span slot="source">${localize('mental')}</span></health-item
            >`
          : ''}
        ${physicalHealth
          ? html`
              <health-item
                clickable
                data-renderer=${CharacterDrawerRenderer.SleevePhysicalHealth}
                @click=${this.setDrawerRenderer}
                .health=${physicalHealth}
              >
              </health-item>
            `
          : ''}
        ${meshHealth && sleeve
          ? html` <health-item
              clickable
              data-renderer=${CharacterDrawerRenderer.SleeveMeshHealth}
              @click=${this.setDrawerRenderer}
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
    </div>`;
  }

  activateTab(ev: DragEvent & { currentTarget: HTMLElement }) {
    if (ev.currentTarget === ev.target) ev.currentTarget.click();
  }

  private renderMotivation = (motivation: Ego['motivations'][number]) => {
    // TODO heal stress
    // TODO Show goals
    return html`
      <li class="motivation">
        <!-- <button> -->
        <mwc-icon class=${motivation.stance}
          >${motivation.stance === MotivationStance.Support
            ? 'add'
            : 'remove'}</mwc-icon
        >
        ${motivation.cause}
        <!-- </button> -->
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
      <div class="icon-buttons">
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
          content: html`<img src=${localImage('icons/actions/medicines.svg')} />
            <notification-coin
              value=${this.character.activeSubstances.length +
              this.character.awaitingOnsetSubstances.length}
              ?actionRequired=${this.character.awaitingOnsetSubstances.some(
                (s) => s.awaitingOnsetTimeState.completed,
              ) ||
              this.character.activeSubstances.some(
                ({ appliedInfo }) => appliedInfo.requiresAttention,
              )}
            ></notification-coin>`,
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
      </div>

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
                @focus=${tooltip.fromData}
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

  private static traits = [ItemGroup.EgoTraits, ItemGroup.MorphTraits];

  private static sleights = [
    ItemGroup.PassiveSleights,
    ItemGroup.ActiveSleights,
  ];

  private static gear = [
    ItemGroup.Consumables,
    ItemGroup.Equipped,
    ItemGroup.Stashed,
  ];

  private renderTabbedContent() {
    switch (this.currentTab) {
      case 'combat':
        return html`
          <character-view-attacks-section
            .character=${this.character}
            .token=${this.token}
          ></character-view-attacks-section>
        `;

      case 'gear':
        return html`${repeat(
          CharacterViewAlt.gear,
          identity,
          this.renderItemGroup,
        )}`;

      case 'traits':
        return html`${repeat(
          CharacterViewAlt.traits,
          identity,
          this.renderItemGroup,
        )}`;

      case 'sleights': {
        const { applyLocalSleightEffects } = this.character;
        return html`<div
          class="sleights ${classMap({
            inactive: !applyLocalSleightEffects,
          })}"
        >
          ${!applyLocalSleightEffects
            ? html`<div class="inactive">${localize('inactive')}</div>`
            : ''}
          ${repeat(CharacterViewAlt.sleights, identity, this.renderItemGroup)}
        </div>`;
      }

      case 'details':
        return this.renderDetails();

      case 'tests':
        return html`<character-view-test-actions
          class="actions"
          .character=${this.character}
          .ego=${this.character.ego}
        ></character-view-test-actions>`;
    }
  }

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
    return html`
      <character-view-item-group
        .character=${this.character}
        group=${group}
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
