import { renderNumberField } from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import { ActorType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { HealthEditor } from '@src/health/components/health-editor/health-editor';
import type { ActorHealth } from '@src/health/health-mixin';
import { hardeningTypes } from '@src/health/mental-health';
import { debounce } from '@src/utility/decorators';
import { internalProperty, LitElement, property, query } from 'lit-element';
import { html, TemplateResult } from 'lit-html';
import { traverseActiveElements } from 'weightless';
import type { MaybeToken } from '../../actor';
import type { Character } from '../../proxies/character';
import type { CharacterDrawerRenderer } from './character-drawer-render-event';

export enum ItemGroup {
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

  protected openHealthEditor(health: ActorHealth) {
    const active = traverseActiveElements()
    HealthEditor.openWindow({
      actor: this.character.actor,
      initialHealth: health,
      adjacentEl: active instanceof HTMLElement ? active : undefined,
    });
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
    return html`
      <section>
        <character-view-drawer-heading
          >${localize('mentalHealth')}</character-view-drawer-heading
        >
        <health-state-form
          .health=${this.character.ego.mentalHealth}
        ></health-state-form>
        <p class="hardening-label">${localize('hardening')}</p>
        ${renderUpdaterForm(
          this.character.ego.updater.prop('data', 'mentalHealth'),
          {
            fields: (hardenings) =>
              hardeningTypes.map((type) =>
                renderNumberField(hardenings[type], { min: 0, max: 5 }),
              ),
          },
        )}

        <mwc-button
          @click=${() => this.openHealthEditor(this.character.ego.mentalHealth)}
          >${localize('heal')} / ${localize('damage')}</mwc-button
        >

        <sl-details summary=${localize('history')}>
          <health-log
            .health=${this.character.ego.mentalHealth}
            ?disabled=${this.character.disabled}
          ></health-log>
        </sl-details>
      </section>
    `;
  }

  renderSleevePhysicalHealth() {
    const { sleeve } = this.character;
    if (!sleeve || sleeve?.type === ActorType.Infomorph) return html``;
    const { physicalHealth: health } = sleeve;
    return html`
      <section>
        <character-view-drawer-heading
          >${localize('physicalHealth')}</character-view-drawer-heading
        >
        <health-state-form .health=${health}></health-state-form>

        <mwc-button @click=${() => this.openHealthEditor(health)}
          >${localize('heal')} / ${localize('damage')}</mwc-button
        >

<section>
<sl-header heading=${localize("damageOverTime")}>
<mwc-icon-button icon="add"></mwc-icon-button>
</sl-header>

</section>

        <sl-details summary=${localize('history')}>
          <health-log
            .health=${health}
            ?disabled=${this.character.disabled}
          ></health-log>
        </sl-details>
      </section>
    `;
  }

  renderSleeveMeshHealth() {
    const { sleeve } = this.character;
    if (!sleeve?.activeMeshHealth) return html``;
    const { activeMeshHealth: health } = sleeve;
    return html`
      <section>
        <character-view-drawer-heading
          >${localize('meshHealth')}</character-view-drawer-heading
        >
        <health-state-form .health=${health}></health-state-form>

        <mwc-button @click=${() => this.openHealthEditor(health)}
          >${localize('heal')} / ${localize('damage')}</mwc-button
        >

        <sl-details summary=${localize('history')}>
          <health-log
            .health=${health}
            ?disabled=${this.character.disabled}
          ></health-log>
        </sl-details>
      </section>
    `;
  }
}
