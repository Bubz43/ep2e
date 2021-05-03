import type { List } from '@material/mwc-list';
import type { PoolType } from '@src/data-enums';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { ItemEP, ItemProxy } from '@src/entities/item/item';
import type { Psi } from '@src/entities/item/proxies/psi';
import type { ConditionType } from '@src/features/conditions';
import { poolActionOptions } from '@src/features/pools';
import {
  createTemporaryMeasuredTemplate,
  placeMeasuredTemplate,
  readyCanvas,
} from '@src/foundry/canvas';
import { DropType, handleDrop, isKnownDrop } from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { RenderDialogEvent } from '@src/open-dialog';
import { openMenu } from '@src/open-menu';
import { debounce } from '@src/utility/decorators';
import { notEmpty } from '@src/utility/helpers';
import { internalProperty, LitElement, property, query } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { traverseActiveElements } from 'weightless';
import type { MaybeToken } from '../../actor';
import type { Character } from '../../proxies/character';
import {
  CharacterDrawerRenderer,
  CharacterDrawerRenderEvent,
} from './character-drawer-render-event';
import { CharacterRequestEvent } from './character-request-event';

export enum ItemGroup {
  Consumables = 'consumables',
  PassiveSleights = 'passiveSleights',
  ActiveSleights = 'activatedSleights',
  EgoTraits = 'egoTraits',
  MorphTraits = 'morphTraits',
  VehicleTraits = 'vehicleTraits',
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
    this.addEventListener('drop', this.handleFolderDrop);
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

  protected openPoolMenu(ev: MouseEvent & { currentTarget: HTMLElement }) {
    const { pool } = ev.currentTarget.dataset;
    if (pool) {
      openMenu({
        header: { heading: localize(pool as PoolType) },
        content: poolActionOptions(this.character, pool as PoolType),
        position: ev,
      });
    }
  }

  private handleFolderDrop = handleDrop(({ drop }) => {
    if (this.character.disabled) return;
    if (
      isKnownDrop(drop) &&
      drop.type === DropType.Folder &&
      drop.entity === 'Item'
    ) {
      const folder = game.folders.get(drop.id);
      const items = folder && (folder?.entities as ItemEP[]);
      if (folder && notEmpty(items)) {
        this.dispatchEvent(
          new RenderDialogEvent(html`
            <mwc-dialog heading=${folder.name}>
              <mwc-list multi>
                ${items.map(({ proxy }) => {
                  const selected =
                    proxy.type !== ItemType.Psi || !this.character.psi;
                  return html`
                    <mwc-check-list-item
                      ?selected=${selected}
                      ?disabled=${!selected}
                      twoline
                    >
                      <span>${proxy.fullName}</span>
                      <span slot="secondary">${proxy.fullType}</span>
                    </mwc-check-list-item>
                  `;
                })}
              </mwc-list>
              <mwc-button
                unelevated
                slot="primaryAction"
                dialogaction="confirm"
                @click=${async (ev: Event & { currentTarget: HTMLElement }) => {
                  const list = ev.currentTarget.previousElementSibling as List;
                  const { index } = list;
                  if (index instanceof Set) {
                    const { psi, others } = [...index].reduce(
                      (accum, i) => {
                        const proxy = items[i]?.proxy;
                        if (proxy?.type === ItemType.Psi) accum.psi = proxy;
                        else if (proxy) accum.others.push(proxy);
                        return accum;
                      },
                      {
                        psi: null as Psi | null,
                        others: [] as Exclude<ItemProxy, Psi>[],
                      },
                    );
                    if (psi)
                      await this.character.ego.addPsi?.(psi.getDataCopy());
                    this.character.itemOperations.add(
                      ...others.map((p) => p.getDataCopy()),
                    );
                  }
                }}
                >${localize('add')}</mwc-button
              >
              <mwc-button slot="secondaryAction" dialogaction="cancel"
                >${localize('cancel')}</mwc-button
              >
            </mwc-dialog>
          `),
        );
      }
    }
  });

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
    return html`<character-view-substances
      .character=${this.character}
    ></character-view-substances>`;
  }
}
