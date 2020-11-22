import type { TabBar } from '@material/mwc-tab-bar';
import type { ItemProxy } from '@src/entities/item/item';
import { idProp } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, PropertyValues, query } from 'lit-element';
import { nothing } from 'lit-html';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { first } from 'remeda';
import { stopEvent } from 'weightless';
import { CharacterViewBase } from './character-view-base';
import styles from './character-view.scss';

const tabs = ['status', 'combat', 'psi'] as const;

@customElement('character-view')
export class CharacterView extends CharacterViewBase {
  static get is() {
    return 'character-view' as const;
  }

  static styles = [styles];

  @query('.tabbed-content')
  tabbedSection!: HTMLElement;

  @query('#primary-tabs')
  tabBar?: TabBar;

  updated(changedProps: PropertyValues) {
    const { tabBar } = this;
    if (tabBar) {
      requestAnimationFrame(() => {
        const tabElements = [...tabBar.querySelectorAll('mwc-tab')];
        const activeElement = tabElements[tabBar.activeIndex];
        if (!activeElement?.active) first(tabElements)?.click();
      });
    }
    super.updated(changedProps);
  }

  private changeTab() {
    this.requestUpdate();
  }

  private get tabbedContent() {
    const index = this.tabBar?.activeIndex || 0;
    switch (tabs[index]) {
      case 'psi':
        return this.renderPsi();

      case 'combat':
        return this.renderCombat();

      case 'status':
      default:
        return this.renderStatus();
    }
  }

  render() {
    const showPsi = !!(this.character.psi || notEmpty(this.character.sleights));
    // TODO Disable controls if token is not on scene
    return html`
      <character-view-header
        .character=${this.character}
        .token=${this.token}
      ></character-view-header>

      <div class="side">
        <character-view-ego
          .character=${this.character}
          .ego=${this.character.ego}
        ></character-view-ego>
        ${this.character.sleeve
          ? html`
              <character-view-sleeve
                .character=${this.character}
                .sleeve=${this.character.sleeve}
              ></character-view-sleeve>
            `
          : html`
              <div class="sleeve-select">
                <mwc-button
                  raised
                  ?disabled=${this.character.disabled}
                  label="${localize('select')} ${localize('sleeve')}"
                  @click=${() => this.toggleDrawerContent(this.renderResleeve)}
                ></mwc-button>
              </div>
            `}
      </div>
      ${this.renderDrawer()}

      <mwc-tab-bar id="primary-tabs" @MDCTabBar:activated=${this.changeTab}>
        ${tabs.map((tab) =>
          showPsi || tab !== 'psi'
            ? html` <mwc-tab label=${localize(tab)}></mwc-tab> `
            : '',
        )}
      </mwc-tab-bar>

      <section class="tabbed-content">${cache(this.tabbedContent)}</section>
    `;
  }

  private renderPsi() {
    return html``;
  }

  private renderCombat() {
    return html``;
  }

  private renderStatus() {
    const { traits, equipped, consumables, stashed } = this.character;
    return html`
      <sl-header
        heading=${localize('traits')}
        ?hideBorder=${traits.length === 0}
      ></sl-header>
      ${notEmpty(traits) ? this.renderItemList(traits) : ''}
      ${notEmpty(consumables)
        ? html`
            <sl-header heading=${localize('consumables')}></sl-header>
            ${this.renderItemList(consumables)}
          `
        : ''}

      <sl-header heading=${localize('equipped')}></sl-header>
      ${notEmpty(equipped) ? this.renderItemList(equipped) : ''}

      <sl-header
        heading=${localize('stashed')}
        ?hideBorder=${stashed.length === 0}
      ></sl-header>
      ${notEmpty(stashed) ? this.renderItemList(stashed) : ''}
    `;
  }

  private renderItemList(proxies: ItemProxy[]) {
    return html`
      <sl-animated-list class="proxy-list">
        ${repeat(
          proxies,
          idProp,
          (proxy) => html`
            <wl-list-item clickable class="item-proxy" @click=${proxy.openForm}>
              <span>${proxy.name}</span>
              <delete-button
                slot="after"
                @delete=${proxy.deleteSelf}
                @click=${stopEvent}
              ></delete-button>
            </wl-list-item>
          `,
        )}
      </sl-animated-list>
    `;
  }

  protected renderDrawer() {
    const { drawerIsOpen } = this;
    return html`
      <focus-trap class="drawer ${classMap({ open: drawerIsOpen })}">
        ${drawerIsOpen
          ? html`
              <mwc-icon-button
                class="close-drawer"
                icon="arrow_back"
                @click=${this.closeDrawer}
              ></mwc-icon-button>
              ${this.renderDrawerContent()}
            `
          : nothing}
      </focus-trap>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view': CharacterView;
  }
}
