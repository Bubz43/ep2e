import { renderLabeledCheckbox } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { ActorType, ItemType } from '@src/entities/entity-types';
import {
  Substance,
  SubstanceUseMethod,
} from '@src/entities/item/proxies/substance';
import { PoolItem } from '@src/features/components/pool-item/pool-item';
import type { ConditionType } from '@src/features/conditions';
import { idProp, matchID } from '@src/features/feature-helpers';
import { poolActionOptions } from '@src/features/pools';
import { prettyMilliseconds } from '@src/features/time';
import {
  createTemporaryMeasuredTemplate,
  placeMeasuredTemplate,
  readyCanvas,
} from '@src/foundry/canvas';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { openMenu } from '@src/open-menu';
import { debounce } from '@src/utility/decorators';
import { notEmpty } from '@src/utility/helpers';
import { internalProperty, LitElement, property, query } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { repeat } from 'lit-html/directives/repeat';
import { traverseActiveElements } from 'weightless';
import type { MaybeToken } from '../../actor';
import type { Character } from '../../proxies/character';
import {
  CharacterDrawerRenderer,
  CharacterDrawerRenderEvent,
} from './character-drawer-render-event';
import { CharacterRequestEvent } from './character-request-event';
import { substanceActivationDialog } from './components/substance-activation-dialog';

export enum ItemGroup {
  Consumables = 'consumables',
  Sleights = 'sleights',
  Traits = 'traits',
  Equipped = 'equipped',
  Stashed = 'stashed',
}

export abstract class CharacterViewBase extends LitElement {
  protected abstract renderDrawer(): TemplateResult;

  @property({ attribute: false }) character!: Character;

  @property({
    attribute: false,
    hasChanged(value, oldValue) {
      return !value || !oldValue || value === oldValue;
    },
  })
  token?: MaybeToken;

  @internalProperty() protected drawerContentRenderer:
    | (() => TemplateResult)
    | null = null;

  @query('.drawer', true)
  private drawer!: HTMLElement;

  protected drawerOpener: HTMLElement | null = null;

  disconnectedCallback() {
    this.closeDrawer();
    super.disconnectedCallback();
  }

  firstUpdated() {
    this.addEventListener(CharacterDrawerRenderEvent.is, ({ renderer }) => {
      this.toggleDrawerRenderer(renderer);
    });
    this.addEventListener(CharacterRequestEvent.is, (ev) => {
      ev.character = this.character;
      ev.token = this.token;
      ev.stopPropagation();
    });
  }

  protected toggleDrawerRenderer(renderer: CharacterDrawerRenderer) {
    this.toggleDrawerContent(this[`render${renderer}` as const]);
  }

  protected renderDrawerContent() {
    return this.drawerContentRenderer?.call(this) ?? '';
  }

  @debounce(200, true)
  protected toggleDrawerContent(fn: () => TemplateResult) {
    if (this.drawerContentRenderer === fn) this.closeDrawer();
    else {
      const active = traverseActiveElements();
      if (active instanceof HTMLElement) this.drawerOpener = active;
      this.drawerContentRenderer = fn;
    }
  }

  protected closeDrawer() {
    if (this.isConnected && this.drawer.classList.contains('open')) {
      this.drawer.classList.add('closing');
      this.drawer.addEventListener(
        'animationend',
        () => {
          this.drawerContentRenderer = null;
          this.drawer.classList.remove('closing');
          if (this.drawerOpener?.isConnected) this.drawerOpener.focus();
          this.drawerOpener = null;
        },
        { once: true },
      );
    } else this.drawerContentRenderer = null;
  }

  get drawerIsOpen() {
    return !!this.drawerContentRenderer;
  }

  protected applyDroppedSubstance = handleDrop(async ({ ev, data }) => {
    if (data?.type === DropType.Item && !this.character.disabled) {
      const item = await itemDropToItemProxy(data);
      if (item?.type !== ItemType.Substance || !item.quantity) return;
      let isHidden = false;

      const addSubstance = async (method: SubstanceUseMethod) => {
        const [id] = await this.character.itemOperations.add(
          item.createAwaitingOnset({ method }),
        );
        if (item.actor && item.editable) await item.use();

        await this.updateComplete;
        setTimeout(() => {
          if (Substance.onsetTime(method) === 0 && id) {
            this.openSubstanceActivationDialog(id);
          }
        }, 1);
      };
      if (
        item.applicationMethods.length === 1 &&
        this.character.hasItemProxy(item)
      ) {
        addSubstance(item.applicationMethods[0]!);
      } else {
        openMenu({
          header: { heading: `${localize('apply')} ${item.name}` },
          content: [
            renderAutoForm({
              props: { hidden: isHidden },
              update: ({ hidden = false }) => (isHidden = hidden),
              fields: ({ hidden }) => renderLabeledCheckbox(hidden),
            }),
            'divider',
            ...item.applicationMethods.map((method) => ({
              label: `${localize(method)} - ${localize(
                'onset',
              )}: ${prettyMilliseconds(Substance.onsetTime(method))}`,
              callback: () => addSubstance(method),
            })),
          ],
          position: ev,
        });
      }
    }
  });

  protected openSubstanceActivationDialog(id: string) {
    const substance = this.character.awaitingOnsetSubstances.find(matchID(id));
    console.log(substance);
    if (!substance) return;
    if (
      notEmpty(
        Object.values(this.character.appliedEffects.substanceModifiers).flat(),
      )
    ) {
      this.dispatchEvent(
        new RenderDialogEvent(
          substanceActivationDialog(this.character, substance),
        ),
      );
    } else substance.makeActive([]);
  }

  protected toggleCondition(ev: Event) {
    if (ev.currentTarget instanceof HTMLElement) {
      const { condition } = ev.currentTarget.dataset;
      condition && this.character.toggleCondition(condition as ConditionType);
    }
  }

  protected async placeMovementPreviewTemplate(range: number) {
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

  protected openPoolMenu(ev: MouseEvent) {
    if (ev.currentTarget instanceof PoolItem) {
      const { type } = ev.currentTarget.pool;
      openMenu({
        header: { heading: localize(type) },
        content: poolActionOptions(this.character, type),
        position: ev,
      });
    }
  }

  renderResleeve() {
    return html`
      <character-view-resleeve
        .character=${this.character}
      ></character-view-resleeve>
    `;
  }

  renderEffects() {
    return html`
      <effects-viewer
        .effects=${this.character.appliedEffects}
      ></effects-viewer>
    `;
  }

  renderSearch() {
    return html`
      <character-view-search
        .character=${this.character}
      ></character-view-search>
    `;
  }

  renderRecharge() {
    return html`
      <character-view-recharge
        .character=${this.character}
      ></character-view-recharge>
    `;
  }

  renderTime() {
    return html`
      <character-view-time .character=${this.character}></character-view-time>
    `;
  }

  renderNetworkSettings() {
    return html`
      <character-view-network-settings
        .character=${this.character}
      ></character-view-network-settings>
    `;
  }

  renderArmor() {
    return html`
      <character-view-armor .character=${this.character}></character-view-armor>
    `;
  }

  renderMentalHealth() {
    return html`<character-view-mental-health
      .health=${this.character.ego.mentalHealth}
      .character=${this.character}
    ></character-view-mental-health>`;
  }

  renderSleevePhysicalHealth() {
    const { sleeve } = this.character;
    if (!sleeve || sleeve?.type === ActorType.Infomorph) return html``;
    return html`<character-view-physical-health
      .health=${sleeve.physicalHealth}
      .sleeve=${sleeve}
      .character=${this.character}
    ></character-view-physical-health>`;
  }

  renderSleeveMeshHealth() {
    const { sleeve } = this.character;
    if (!sleeve?.activeMeshHealth) return html``;
    return html`
      <character-view-mesh-health
        .character=${this.character}
        .health=${sleeve?.activeMeshHealth}
      ></character-view-mesh-health>
    `;
  }

  renderConditions() {
    return html`<character-view-conditions
      .character=${this.character}
    ></character-view-conditions>`;
  }

  renderSubstances() {
    const {
      awaitingOnsetSubstances,
      activeSubstances,
      conditions,
      pools,
      disabled,
      temporaryConditionSources,
      sleeve,
    } = this.character;
    return html` <sl-dropzone
      class="applied-substances"
      ?disabled=${this.character.disabled}
      @drop=${this.applyDroppedSubstance}
    >
      ${activeSubstances.length + awaitingOnsetSubstances.length === 0
        ? html`
            <p class="no-substances-message">
              ${localize('no')} ${localize('applied')}
              ${localize('substances')}.
            </p>
          `
        : html`
            ${notEmpty(activeSubstances)
              ? html`
                  <sl-details
                    open
                    summary="${localize('active')} ${localize(
                      'substances',
                    )} (${activeSubstances.length})"
                  >
                    <sl-animated-list class="active-substances">
                      ${repeat(
                        activeSubstances,
                        idProp,
                        (substance) => html`
                          <character-view-active-substance
                            .substance=${substance}
                            .character=${this.character}
                          ></character-view-active-substance>
                        `,
                      )}
                    </sl-animated-list>
                  </sl-details>
                `
              : ''}
            ${notEmpty(awaitingOnsetSubstances)
              ? html`
                  <sl-details
                    open
                    summary="${localize(
                      'substancesAwaitingOnset',
                    )} (${awaitingOnsetSubstances.length})"
                  >
                    <sl-animated-list>
                      ${repeat(
                        awaitingOnsetSubstances,
                        idProp,
                        (substance) => html`
                          <time-state-item
                            ?disabled=${disabled}
                            .timeState=${substance.awaitingOnsetTimeState}
                            completion="ready"
                            .item=${substance}
                          >
                            <mwc-icon-button
                              slot="action"
                              icon="play_arrow"
                              data-tooltip=${localize('start')}
                              @mouseover=${tooltip.fromData}
                              @click=${() => {
                                this.openSubstanceActivationDialog(
                                  substance.id,
                                );
                              }}
                            ></mwc-icon-button>
                          </time-state-item>
                        `,
                      )}
                    </sl-animated-list></sl-details
                  >
                `
              : ''}
          `}
    </sl-dropzone>`;
  }
}
