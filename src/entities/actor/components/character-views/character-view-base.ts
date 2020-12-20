import { renderLabeledCheckbox } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { ActorType } from '@src/entities/entity-types';
import { matchID } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { RenderDialogEvent } from '@src/open-dialog';
import { debounce } from '@src/utility/decorators';
import { internalProperty, LitElement, property, query } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { traverseActiveElements } from 'weightless';
import type { MaybeToken } from '../../actor';
import type { Character } from '../../proxies/character';
import type { CharacterDrawerRenderer } from './character-drawer-render-event';

export enum ItemGroup {
  Sleights = 'sleights',
  Traits = 'traits',
  Consumables = 'consumables',
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
    this.addEventListener('character-drawer-render', ({ renderer }) => {
      this.toggleDrawerRenderer(renderer);
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

  protected openActiveSubstanceControls(id: string) {
    const substance = this.character.activeSubstances.find(matchID(id));
    if (!substance?.epFlags?.active || this.character.disabled) return;
    let appliedState = duplicate(substance.epFlags.active);
    this.dispatchEvent(
      new RenderDialogEvent(html`
        <mwc-dialog open heading=${substance.name}>
          ${renderAutoForm({
            props: appliedState,
            update: (change) => (appliedState = { ...appliedState, ...change }),
            fields: ({ applySeverity }) => [
              substance.hasSeverity ? renderLabeledCheckbox(applySeverity) : '',
            ],
          })}
          <mwc-button dense slot="secondaryAction" dialogAction="cancel"
            >${localize('cancel')}</mwc-button
          >
          <mwc-button
            dense
            slot="primaryAction"
            dialogAction="confirm"
            unelevated
            @click=${() => substance.updateAppliedState(appliedState)}
            >${localize('save')}</mwc-button
          >
        </mwc-dialog>
      `),
    );
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
}
