import {
  CombatActionType,
  rollInitiative,
  Surprise,
  TrackedCombatEntity,
  updateCombatState,
} from '@src/combat/combat-tracker';
import { OpenEvent, Placement } from '@src/components/popover/popover-options';
import {
  Complexity,
  enumValues,
  RechargeType,
  ShellType,
  VehicleType,
} from '@src/data-enums';
import { morphAcquisitionDetails } from '@src/entities/components/sleeve-acquisition';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { ConsumableItem } from '@src/entities/item/item';
import { ArmorType } from '@src/features/active-armor';
import { complexityGP } from '@src/features/complexity';
import { conditionIcons, ConditionType } from '@src/features/conditions';
import { formatEffect } from '@src/features/effects';
import {
  addFeature,
  idProp,
  removeFeature,
  updateFeature,
} from '@src/features/feature-helpers';
import { toMilliseconds } from '@src/features/modify-milliseconds';
import { MotivationStance } from '@src/features/motivations';
import { influenceInfo, PsiInfluenceType } from '@src/features/psi-influence';
import { createTemporaryFeature } from '@src/features/temporary';
import {
  CommonInterval,
  EPTimeInterval,
  prettyMilliseconds,
} from '@src/features/time';
import {
  actorDroptoActorProxy,
  DropType,
  handleDrop,
  setDragDrop,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { userCan } from '@src/foundry/misc-helpers';
import { rollFormula } from '@src/foundry/rolls';
import { EP } from '@src/foundry/system';
import { gameSettings, tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { clickIfEnter, notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import {
  customElement,
  html,
  property,
  PropertyValues,
  state,
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
  omit,
  prop,
  range,
  sortBy,
} from 'remeda';
import { NotificationType, notify } from '../../../../foundry/foundry-apps';
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

  @property({ type: Boolean, reflect: true }) compact = false;

  @property({ type: Boolean, reflect: true }) disableTransparency = false;

  @state() private currentTab: CharacterTab = 'combat';

  private transparencyUnsub: (() => void) | null = null;

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

  connectedCallback() {
    super.connectedCallback();
    this.transparencyUnsub = gameSettings.disableSheetTransparency.subscribe(
      (value) => (this.disableTransparency = value),
    );
  }

  disconnectedCallback() {
    this.transparencyUnsub?.();
    this.transparencyUnsub = null;
    super.disconnectedCallback();
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
          entityIdentifiers: this.token?.parent
            ? {
                type: TrackedCombatEntity.Token,
                tokenId: this.token.id,
                sceneId: this.token.parent.id,
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

  private static exoskeletons = [
    VehicleType.Exoskeleton,
    VehicleType.Hardsuit,
  ] as string[];

  private draggingSelf = false;

  private handleEntityDrop = handleDrop(async ({ data, ev }) => {
    if (this.draggingSelf) return;
    if (data?.type !== DropType.Actor || this.character.disabled) {
      notify(NotificationType.Info, localize('dropSleeve/Exoskeleton'));
      return;
    }
    const proxy = await actorDroptoActorProxy(data);
    if (proxy && proxy.type !== ActorType.Character) {
      const resleeve = async () => {
        if (this.drawerContentRenderer !== this.renderResleeve) {
          this.toggleDrawerRenderer(CharacterDrawerRenderer.Resleeve);
        }
        await this.updateComplete;
        const resleeveView = this.renderRoot.querySelector(
          'character-view-resleeve',
        );
        if (resleeveView) resleeveView.selectedSleeve = proxy;
      };
      if (
        proxy.type === ActorType.Synthetic &&
        proxy.epData.shellType === ShellType.Vehicle &&
        CharacterViewAlt.exoskeletons.includes(proxy.epData.subtype) &&
        this.character.sleeve &&
        this.character.sleeve.type !== ActorType.Infomorph
      ) {
        openMenu({
          header: { heading: proxy.name },
          position: ev,
          content: [
            {
              label: localize('resleeve'),
              callback: resleeve,
            },
            {
              label: `${localize('equip')} ${localize('as')} ${localize(
                'exoskeleton',
              )}`,
              callback: async () => {
                const addedItemIds = await this.character.itemOperations.add(
                  ...[...proxy.items.values()].map((i) => i.getDataCopy()),
                );
                const vehicleData = proxy.dataCopy();
                vehicleData.flags.ep2e = {
                  ...(vehicleData.flags.ep2e || {}),
                  exoskeletonItemIds: addedItemIds,
                };
                this.character.updater
                  .path('flags', EP.Name, 'vehicle')
                  .commit(vehicleData);
              },
              disabled: !!this.character.vehicle,
            },
          ],
        });
      } else resleeve();
    } else notify(NotificationType.Info, localize('dropSleeve/Exoskeleton'));
  });

  private setSelfDrag(ev: DragEvent) {
    this.draggingSelf = true;
    const { isToken, id, compendium } = this.character.actor;
    setDragDrop(
      ev,
      isToken
        ? {
            type: DropType.Actor,
            data: {
              ...this.character.dataCopy(),
              _id: '',
            },
          }
        : {
            type: DropType.Actor,
            id,
            pack: compendium?.collection,
          },
    );
  }

  private setSleeveDragData(ev: DragEvent) {
    const { sleeve } = this.character;
    if (!sleeve) return;
    this.draggingSelf = true;
    setDragDrop(ev, {
      type: DropType.Actor,
      data: {
        ...sleeve.dataCopy(),
        name: `${this.character.name}'s ${sleeve.name}`,
        items: [...sleeve.items.values()].map((i) => i.getDataCopy()),
        _id: '',
      },
    });
  }

  private setDraggingEnd() {
    this.draggingSelf = false;
  }

  render() {
    if (this.character.isLimited) return this.renderLimited();
    return html`
      ${this.renderHeader()} ${this.renderContent()} ${this.renderDrawer()}
      ${this.renderFooter()}
    `;
  }

  private renderLimited() {
    const { sleeve, vehicle, img } = this.character;
    return html`
      <div class="limited">
        <header>
          <div class="avatar">
            <img src=${img} width="84px" />
          </div>
          <h1>${this.character.name}</h1>
          <span class="info">${localize('public')} ${localize('profile')}</span>
        </header>

        ${sleeve
          ? html`
              <div>
                ${sleeve.name}
                <span class="info"
                  >${formattedSleeveInfo(sleeve, vehicle).join(' - ')}</span
                >
              </div>
            `
          : ''}
      </div>
    `;
  }

  private renderContent() {
    const { character, currentTabs } = this;
    const { psi } = character;
    return html` <div class="content">
      <div class="psi">
        ${psi
          ? html`<character-view-psi
              .character=${this.character}
              .psi=${psi}
            ></character-view-psi>`
          : ''}
        ${this.renderForeignInfluences()}
      </div>

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
    </div>`;
  }

  private openForeignInfluenceMenu(
    ev: MouseEvent & { currentTarget: HTMLElement },
  ) {
    const { id } = ev.currentTarget.dataset;
    const influence = this.character.foreignPsiInfluences.find(
      (i) => i.id === id,
    );
    if (!influence || !id) return;
    const { name } = influenceInfo(influence);
    openMenu({
      position: ev,
      header: { heading: name },
      content: [
        {
          label: `${localize('end')} ${localize('influence')}`,
          callback: () => {
            this.character.updater
              .path('flags', EP.Name, 'foreignPsiInfluences')
              .commit(
                (influences) => influences && removeFeature(influences, id),
              );
          },
        },
      ],
    });
  }

  private renderForeignInfluences() {
    const { foreignPsiInfluences } = this.character;

    return html` ${foreignPsiInfluences.length
      ? html` <h3 class="foreign-influence-heading">
            ${localize('foreign')} ${localize('psiInfluences')}
          </h3>
          <sl-animated-list class="foreign-influences">
            ${repeat(foreignPsiInfluences, idProp, (influence) => {
              const { timeState } = influence;
              const remaining = prettyMilliseconds(timeState.remaining, {
                compact: true,
                approx: true,
                whenZero: localize('expired'),
              });
              const badge = html`
                <span
                  class="badge ${timeState.completed ? 'expired' : ''}"
                  slot="after"
                  >${remaining}</span
                >
              `;

              if (influence.type === PsiInfluenceType.Motivation) {
                const { motivation, description } = influence;
                return html`
                  <colored-tag
                    data-id=${influence.id}
                    @click=${this.openForeignInfluenceMenu}
                    clickable
                    ?disabled=${this.character.disabled}
                    @mouseover=${(
                      ev: MouseEvent & { currentTarget: HTMLElement },
                    ) => {
                      tooltip.attach({
                        el: ev.currentTarget,
                        content: html` <p
                            style="color: var(--ep-color-primary-alt)"
                          >
                            ${prettyMilliseconds(timeState.remaining, {
                              compact: false,
                              whenZero: localize('expired'),
                            })}
                            ${timeState.completed
                              ? ''
                              : localize('remaining').toLocaleLowerCase()}
                          </p>
                          <p>${description}</p>`,
                        position: 'bottom-middle',
                      });
                    }}
                  >
                    <span class="motivation"
                      ><mwc-icon class=${motivation.stance}
                        >${motivation.stance === MotivationStance.Support
                          ? 'add'
                          : 'remove'}</mwc-icon
                      >
                      ${motivation.cause}
                    </span>
                    ${badge}
                  </colored-tag>
                `;
              }

              if (influence.type === PsiInfluenceType.Trait) {
                const { name, description } = influenceInfo(influence);
                return html`
                  <colored-tag
                    data-id=${influence.id}
                    @click=${this.openForeignInfluenceMenu}
                    clickable
                    ?disabled=${this.character.disabled}
                    @mouseover=${(
                      ev: MouseEvent & { currentTarget: HTMLElement },
                    ) => {
                      tooltip.attach({
                        el: ev.currentTarget,
                        content: html` <p
                            style="color: var(--ep-color-primary-alt)"
                          >
                            ${prettyMilliseconds(timeState.remaining, {
                              compact: false,
                              whenZero: localize('expired'),
                            })}
                            ${timeState.completed
                              ? ''
                              : localize('remaining').toLocaleLowerCase()}
                          </p>
                          <enriched-html
                            style="padding: 0 0.5rem"
                            .content=${description}
                          ></enriched-html>`,
                        position: 'bottom-middle',
                      });
                    }}
                    >${name} ${badge}
                  </colored-tag>
                `;
              }
              if (influence.type === PsiInfluenceType.Unique) {
                const { name, description } = influenceInfo(influence);
                const { durationFormula, interval, items } = influence.effects;
                const hasEffects = items.length;
                return html` <span
                  class="unique ${hasEffects ? 'has-effects' : ''}"
                  ><colored-tag
                    data-id=${influence.id}
                    data-tooltip=${description}
                    @mouseover=${tooltip.fromData}
                    @click=${this.openForeignInfluenceMenu}
                    clickable
                    ?disabled=${this.character.disabled}
                    >${name} ${badge}
                  </colored-tag>
                  ${hasEffects
                    ? html`<colored-tag
                        type="usable"
                        clickable
                        ?disabled=${this.character.disabled}
                        data-tooltip=${items.map(formatEffect).join('. ')}
                        @mouseover=${tooltip.fromData}
                        @click=${() => {
                          const roll = rollFormula(durationFormula);
                          roll?.toMessage({ flavor: localize(interval) });
                          const total = roll?.total || 1;
                          const duration =
                            interval === EPTimeInterval.ActionTurns
                              ? CommonInterval.Turn * total
                              : toMilliseconds({ [interval]: total });
                          this.character.updater
                            .path('data', 'temporary')
                            .commit((temps) =>
                              addFeature(
                                temps,
                                createTemporaryFeature.effects({
                                  name,
                                  effects: items,
                                  duration,
                                }),
                              ),
                            );
                        }}
                        >${localize('applyEffects')}</colored-tag
                      >`
                    : ''}</span
                >`;
              }

              const { name, description } = influenceInfo(influence);

              return html`
                <colored-tag
                  data-id=${influence.id}
                  data-tooltip=${description}
                  @mouseover=${tooltip.fromData}
                  @click=${this.openForeignInfluenceMenu}
                  clickable
                  ?disabled=${this.character.disabled}
                  >${name} ${badge}
                </colored-tag>
              `;
            })}
          </sl-animated-list>`
      : ''}`;
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
      vehicle,
    } = this.character;
    const { filteredMotivations, settings } = ego;

    const canPlace = userCan('TEMPLATE_CREATE');

    return html`<sl-dropzone
      ?disabled=${disabled}
      class="header"
      @drop=${this.handleEntityDrop}
    >
      <div class="main-entities">
        <div
          class="avatar"
          @click=${() => {
            if (!disabled && 'Tokenizer' in window) {
              (window as any)['Tokenizer'].tokenizeActor(this.character.actor);
            }
          }}
        >
          <img src=${img} width="84px" />
        </div>

        <div class="entities">
          <div
            class="ego-entity"
            draggable="true"
            @dragstart=${this.setSelfDrag}
            @dragend=${this.setDraggingEnd}
          >
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

          <div
            class="sleeve-entity"
            draggable="true"
            @dragstart=${this.setSleeveDragData}
            @dragend=${this.setDraggingEnd}
          >
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
              <mwc-formfield
                label="${sleeve.name} ${localize('painFilter')}"
                class="pain-filter"
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
            return val
              ? html`<span
                  class="mod"
                  title=${mod === 'encumbered'
                    ? `${localize('cannot')} ${localize('move')}`
                    : `${localize('halved')} ${localize('movementRates')}`}
                  >${localize(mod)}</span
                >`
              : '';
          })}
          ${notEmpty(movementRates)
            ? html` ${this.renderMovements(movementRates, canPlace)} `
            : ''}
        </div>
      </div>
      ${this.renderHealths()} ${vehicle ? this.renderVehicle(vehicle) : ''}
    </sl-dropzone>`;
  }

  private renderHealths() {
    const { ego, sleeve, vehicle } = this.character;
    const { settings } = ego;
    const physicalHealth =
      sleeve && 'physicalHealth' in sleeve && sleeve.physicalHealth;
    const meshHealth =
      sleeve && 'activeMeshHealth' in sleeve && sleeve.activeMeshHealth;
    const healths = compact([
      settings.trackMentalHealth &&
        html` <health-item
          clickable
          data-renderer=${CharacterDrawerRenderer.MentalHealth}
          @click=${this.setDrawerRenderer}
          class="mental-health-view"
          .health=${ego.mentalHealth}
        ></health-item>`,
      physicalHealth &&
        html`
          <health-item
            clickable
            data-renderer=${CharacterDrawerRenderer.SleevePhysicalHealth}
            @click=${this.setDrawerRenderer}
            .health=${physicalHealth}
          >
          </health-item>
        `,
      meshHealth &&
        sleeve &&
        html` <health-item
          clickable
          data-renderer=${CharacterDrawerRenderer.SleeveMeshHealth}
          @click=${this.setDrawerRenderer}
          .health=${meshHealth}
        >
          ${sleeve.type !== ActorType.Infomorph && sleeve.nonDefaultBrain
            ? html` <span slot="source">${sleeve.nonDefaultBrain.name}</span> `
            : ''}
        </health-item>`,
      vehicle &&
        html`
          <health-item
            clickable
            data-renderer=${CharacterDrawerRenderer.VehicleHealth}
            @click=${this.setDrawerRenderer}
            .health=${vehicle.physicalHealth}
          >
          </health-item>
        `,
    ]);
    return html`<div
      class="main-healths ${classMap({ even: !(healths.length % 2) })}"
    >
      ${healths}
    </div>`;
  }

  private openVehicleMenu(ev: MouseEvent) {
    const vehicleName = this.character.vehicle?.name || localize('exoskeleton');
    openMenu({
      header: {
        heading: vehicleName,
      },
      content: [
        {
          label: `${localize('unequip')} & ${localize('keep')}`,
          sublabel: localize('requireActorCreationPrivileges'),
          callback: async () => {
            await this.character.vehicle?.createActor(
              `${this.character.name}'s ${vehicleName}`,
            );
            this.character.removeVehicle();
          },
          disabled: !userCan('ACTOR_CREATE'),
        },
        {
          label: localize('delete'),
          callback: () => this.character.removeVehicle(),
        },
      ],
    });
  }

  private renderVehicle(vehicle: NonNullable<Character['vehicle']>) {
    const canPlace = userCan('TEMPLATE_CREATE');

    return html` <div class="vehicle">
      <span>
        <span class="info">[${localize('exoskeleton')}]</span>
        <button class="entity-name" @click=${vehicle.openForm}>
          ${vehicle.name}
        </button>
        <span class="info"> ${formattedSleeveInfo(vehicle).join(' • ')}</span>
      </span>
      ${notEmpty(vehicle.movementRates)
        ? html`
            <div class="movement">
              ${this.renderMovements(
                vehicle.movementRates.map((rate) => ({
                  ...rate,
                  original: rate,
                })),
                canPlace,
              )}
            </div>
          `
        : ''}
      <mwc-icon-button
        icon="more_vert"
        ?disabled=${!this.character.editable}
        @click=${this.openVehicleMenu}
      ></mwc-icon-button>
    </div>`;
  }

  private renderMovements(
    movementRates: Character['movementRates'],
    canPlace: boolean,
  ) {
    return sortBy(movementRates, ({ type }) => localize(type).length).map(
      ({ type, base, full, skill, original }) => html`
        <span class="movement-rate"
          ><span
            data-tooltip=${`${localize('use')} ${skill}`}
            @mouseover=${tooltip.fromData}
            >${localize(type)}</span
          >
          <span class="rate"
            ><button
              class="speed ${classMap({
                increased: base > original.base,
                decreased: base < original.base,
              })}"
              data-tooltip="${localize('original')}: ${original.base}"
              @mouseover=${tooltip.fromData}
              ?disabled=${!canPlace || !base}
              @click=${() => this.placeMovementPreviewTemplate(base)}
            >
              ${base}
            </button>
            /
            <button
              class="speed ${classMap({
                increased: full > original.full,
                decreased: full < original.full,
              })}"
              data-tooltip="${localize('original')}: ${original.full}"
              ?disabled=${!canPlace || !full}
              @mouseover=${tooltip.fromData}
              @click=${() => this.placeMovementPreviewTemplate(full)}
            >
              ${full}
            </button></span
          ></span
        >
      `,
    );
  }

  activateTab(ev: DragEvent & { currentTarget: HTMLElement }) {
    if (ev.currentTarget === ev.target) ev.currentTarget.click();
  }

  private renderMotivation = (motivation: Ego['motivations'][number]) => {
    // TODO heal stress
    const filteredGoals = motivation.goals.filter((g) => g.goal);
    return html`
      <li class="motivation">
        <mwc-icon class=${motivation.stance}
          >${motivation.stance === MotivationStance.Support
            ? 'add'
            : 'remove'}</mwc-icon
        >
        ${motivation.cause}
        ${filteredGoals.length
          ? html`
              <mwc-icon-button
                class="goals-button"
                @click=${(ev: MouseEvent) => {
                  openMenu({
                    position: ev,
                    header: {
                      heading: `${motivation.cause} ${localize('goals')}`,
                    },
                    content: html` ${filteredGoals.map(
                      (goal) => html`
                        <mwc-check-list-item
                          ?disabled=${this.character.disabled}
                          ?selected=${goal.completed}
                          left
                          @click=${() => {
                            this.character.ego.updater
                              .path('data', 'motivations')
                              .commit((motivations) =>
                                updateFeature(motivations, {
                                  id: motivation.id,
                                  goals: updateFeature(motivation.goals, {
                                    id: goal.id,
                                    completed: !goal.completed,
                                  }),
                                }),
                              );
                          }}
                          >${goal.goal}</mwc-check-list-item
                        >
                      `,
                    )}`,
                  });
                }}
              >
                <notification-coin
                  value=${filteredGoals.length}
                ></notification-coin>
              </mwc-icon-button>
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
        : html`<mwc-button
            dense
            @click=${() => this.character.poolHolder.actor.sheet.render(true)}
            >${localize('threat')} ${localize('source')}</mwc-button
          >`}

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
    ItemGroup.SleeveWare,
    ItemGroup.Stashed,
  ];

  private static gearWithVehicle = [
    ItemGroup.Consumables,
    ItemGroup.Equipped,
    ItemGroup.SleeveWare,
    ItemGroup.VehicleGear,
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
          this.character.vehicle
            ? CharacterViewAlt.gearWithVehicle
            : CharacterViewAlt.gear,
          identity,
          this.renderItemGroup,
        )}`;

      case 'traits':
        return html`${repeat(
          this.character.vehicleTraits.length
            ? [...CharacterViewAlt.traits, ItemGroup.VehicleTraits]
            : CharacterViewAlt.traits,
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

  private static gpTotals(
    items: {
      fullName: string;
      multiplier?: number;
      cost: { complexity: Complexity };
    }[],
  ) {
    const totals = items.reduce(
      (accum, item) => {
        const gp = complexityGP[item.cost.complexity];
        const gpNumber = parseInt(String(gp));
        const value = `${gp} ${
          gp === '5+' ? `${localize('as').toLocaleLowerCase()} ${gpNumber}` : ''
        }`;
        if (item.multiplier !== undefined && item.multiplier !== 1) {
          const total = Math.round(gpNumber * item.multiplier * 1000) / 1000;
          accum.total += total;
          accum.parts.push({
            name: item.fullName,
            value: `${item.multiplier} x ${
              gp === '5+' ? `(${value})` : value
            } = ${total}`,
          });
        } else {
          accum.total += gpNumber;
          accum.parts.push({
            name: item.fullName,
            value,
          });
        }

        return accum;
      },
      { total: 0, parts: [] as { name: string; value: string }[] },
    );
    totals.total = Math.round(totals.total * 1000) / 1000;
    return totals;
  }

  private static renderGearPointParts(
    parts: { name: string; value: string }[],
  ) {
    return html`<ul class="gear-parts">
      ${parts.map(
        ({ name, value }) => html`<wl-list-item>
          <span>${name}</span>
          <span slot="after">${value}</span>
        </wl-list-item>`,
      )}
    </ul>`;
  }

  private static consumableGPMultiplier(consumable: ConsumableItem) {
    const { quantity } = consumable;

    switch (consumable.type) {
      case ItemType.Substance:
      case ItemType.ThrownWeapon: {
        const { quantityPerCost } = consumable.epData;
        return quantity / quantityPerCost;
      }
      case ItemType.Explosive: {
        const { unitsPerComplexity } = consumable.epData;
        return quantity / unitsPerComplexity;
      }
      case ItemType.FirearmAmmo: {
        const { roundsPerComplexity } = consumable.epData;
        return quantity / roundsPerComplexity;
      }
    }
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
    const equippedGP = CharacterViewAlt.gpTotals(this.character.equipped);
    const wareGP = CharacterViewAlt.gpTotals(this.character.sleeveWare);
    const consumableGP = CharacterViewAlt.gpTotals(
      this.character.consumables.map((c) => ({
        fullName: c.fullName,
        cost: c.cost,
        multiplier: CharacterViewAlt.consumableGPMultiplier(c),
      })),
    );
    const stashedGP = CharacterViewAlt.gpTotals(
      this.character.stashed.map((s) =>
        'quantity' in s
          ? {
              fullName: s.fullName,
              cost: s.cost,
              multiplier: CharacterViewAlt.consumableGPMultiplier(s),
            }
          : s,
      ),
    );
    return html`
      <div class="gear-points">
        <sl-popover
          placement=${Placement.Left}
          openEvent=${OpenEvent.Hover}
          .renderOnDemand=${() =>
            CharacterViewAlt.renderGearPointParts(consumableGP.parts)}
        >
          <sl-group
            slot="base"
            label="${localize('carried')} ${localize('consumable')} ${localize(
              'SHORT',
              'gearPoints',
            )}"
            >${consumableGP.total}</sl-group
          ></sl-popover
        >
        <sl-popover
          placement=${Placement.Left}
          openEvent=${OpenEvent.Hover}
          .renderOnDemand=${() =>
            CharacterViewAlt.renderGearPointParts(equippedGP.parts)}
        >
          <sl-group
            slot="base"
            label="${localize('equipped')} ${localize('gear')} ${localize(
              'SHORT',
              'gearPoints',
            )}"
            >${equippedGP.total}</sl-group
          ></sl-popover
        >
        <sl-popover
          placement=${Placement.Left}
          openEvent=${OpenEvent.Hover}
          .renderOnDemand=${() =>
            CharacterViewAlt.renderGearPointParts(wareGP.parts)}
        >
          <sl-group
            slot="base"
            label="${this.character.sleeve?.name} ${localize(
              'ware',
            )} ${localize('SHORT', 'gearPoints')}"
            >${wareGP.total}</sl-group
          ></sl-popover
        >
        <sl-popover
          placement=${Placement.Left}
          openEvent=${OpenEvent.Hover}
          .renderOnDemand=${() =>
            CharacterViewAlt.renderGearPointParts(stashedGP.parts)}
        >
          <sl-group
            slot="base"
            label="${localize('stashed')} ${localize('gear')} ${localize(
              'SHORT',
              'gearPoints',
            )}"
            >${stashedGP.total}</sl-group
          ></sl-popover
        >
      </div>
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

  static defaultCollapsed = new Set([
    ItemGroup.Stashed,
    ItemGroup.SleeveWare,
    ItemGroup.VehicleGear,
  ]);

  private renderItemGroup = (group: ItemGroup) => {
    return html`
      <character-view-item-group
        .character=${this.character}
        group=${group}
        ?collapsed=${CharacterViewAlt.defaultCollapsed.has(group)}
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
