import type { TabBar } from "@material/mwc-tab-bar";
import { localize } from "@src/foundry/localization";
import { notEmpty } from "@src/utility/helpers";
import { customElement, html, query } from "lit-element";
import { nothing } from "lit-html";
import { cache } from "lit-html/directives/cache";
import { classMap } from "lit-html/directives/class-map";
import { CharacterViewBase } from "./character-view-base";
import styles from "./character-view.scss";

const tabs = ["status", "combat", "psi"] as const;

@customElement("character-view")
export class CharacterView extends CharacterViewBase {
  static get is() {
    return "character-view" as const;
  }

  static styles = [styles];

  @query(".tabbed-content")
  tabbedSection!: HTMLElement;

  @query("mwc-tab-bar")
  tabBar?: TabBar;

  private changeTab() {
    this.requestUpdate();
  }

  private get tabbedContent() {
    const index = this.tabBar?.activeIndex || 0;
    switch (tabs[index]) {
      case "psi":
        return this.renderPsi();

      case "combat":
        return this.renderCombat();

      case "status":
      default:
        return this.renderStatus();
    }
  }

  render() {
    const showPsi = !!(this.character.psi || notEmpty(this.character.sleights))
    return html`
      

      ${this.renderDrawer()}

      <mwc-tab-bar @MDCTabBar:activated=${this.changeTab}>
        ${tabs.map((tab) =>
          showPsi || tab !== "psi"
            ? html` <mwc-tab label=${localize(tab)}></mwc-tab> `
            : ""
        )}
      </mwc-tab-bar>

      <section class="tabbed-content">${cache(this.tabbedContent)}</section>
    `;
  }

  private renderPsi() {
    return html``
  }

  private renderCombat() {
    return html``
  }

  private renderStatus() {
    return html``
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
    "character-view": CharacterView;
  }
}
