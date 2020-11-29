import type { TabBar } from '@material/mwc-tab-bar';
import { enumValues } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, PropertyValues, query } from 'lit-element';
import { nothing } from 'lit-html';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { first } from 'remeda';
import { CharacterDrawerRenderer } from './character-drawer-render-event';
import { CharacterViewBase, ItemGroup } from './character-view-base';
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

  private toggleNetworkSettings() {
    this.toggleDrawerRenderer(CharacterDrawerRenderer.NetworkSettings);
  }

  render() {
    const showPsi = !!(this.character.psi || notEmpty(this.character.sleights));
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
                  @click=${() =>
                    this.toggleDrawerRenderer(CharacterDrawerRenderer.Resleeve)}
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
    const { masterDevice } = this.character.equippedGroups;
    return html`
      <div class="status">
        <section>
          <sl-header heading=${localize('network')}>
            <mwc-icon-button
              slot="action"
              icon="settings"
              @click=${this.toggleNetworkSettings}
            ></mwc-icon-button>
          </sl-header>
          <div class="network">
            <sl-group label=${localize('masterDevice')}
              >${masterDevice?.fullName ?? '-'}</sl-group
            >
          </div>
          ${masterDevice ? html`
          <health-item clickable .health=${masterDevice.meshHealth}>
          <span slot="source">${localize("meshHealth")} </span>
        </health-item>
          <health-item clickable .health=${masterDevice.firewallHealth}></health-item>
          ` : ""}
        </section>
        ${enumValues(ItemGroup).map(this.renderItemGroup)}
      </div>
    `;
  }

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
    'character-view': CharacterView;
  }
}
