import type { TabBar } from '@material/mwc-tab-bar';
import { LangEntry, localize } from '@src/foundry/localization';
import { LitElement, query } from 'lit-element';
import { TemplateResult, html } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import type { Class } from 'type-fest';

export const TabsMixin = <T extends LangEntry>(tabs: readonly T[]) => (
  Base: Class<LitElement>,
) => {
  class TabsMix extends Base {
    readonly tabs = tabs;
    @query('mwc-tab-bar') tabBar?: TabBar;

    protected changeTab() {
      this.requestUpdate();
    }

    protected get activeTab() {
      return this.tabs[this.tabBar?.activeIndex || 0];
    }

    protected renderTabBar(slot?: string) {
      const tabTemplates: TemplateResult[] = [];
      for (const tab of tabs) {
        const template = this.renderTab(tab);
        if (template) tabTemplates.push(template);
      }
      return html`<mwc-tab-bar
        @MDCTabBar:activated=${this.changeTab}
        slot=${ifDefined(slot)}
      >
        ${tabTemplates}
      </mwc-tab-bar>`;
    }

    protected renderTab(tab: T): TemplateResult | null {
      return html` <mwc-tab label=${localize(tab)}></mwc-tab> `;
    }

    protected renderTabbedContent(content: T) {
      return html``;
    }
  }
  return TabsMix;
};
