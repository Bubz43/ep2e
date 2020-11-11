import type { TabBar } from '@material/mwc-tab-bar';
import { LangEntry, localize } from '@src/foundry/localization';
import { LitElement, PropertyValues, query } from 'lit-element';
import { TemplateResult, html } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import { first } from 'remeda';
import type { Class } from 'type-fest';

export const TabsMixin = <T extends LangEntry>(tabs: readonly T[]) => (
  Base: Class<LitElement>,
) => {
  class TabsMix extends Base {
    readonly tabs = tabs;
    @query('#primary-tab-bar') tabBar?: TabBar;

    protected changeTab() {
      this.requestUpdate();
    }

    protected get activeTab() {
      const tabEl = this.tabElements[this.tabBar?.activeIndex || 0];
      return (tabEl?.dataset.tab as T) ?? tabs[0];
    }

    protected get tabElements() {
      return Array.from(this.tabBar?.querySelectorAll('mwc-tab') ?? []);
    }

    updated(changedProps: PropertyValues) {
      const { tabBar } = this;
      if (tabBar) {
        requestAnimationFrame(() => {
          const { tabElements } = this;
          const activeElement = tabElements[tabBar.activeIndex];
          if (!activeElement?.active) first(tabElements)?.click();
        });
      }
      super.updated(changedProps);
    }

    protected shouldRenderTab(tab: T) {
      return true;
    }

    protected renderTabBar(slot?: string) {
      const tabTemplates: TemplateResult[] = [];
      for (const tab of tabs) {
        if (this.shouldRenderTab(tab)) {
          tabTemplates.push(html`
            <mwc-tab data-tab=${tab} label=${localize(tab)}></mwc-tab>
          `);
        }
      }
      return html`<mwc-tab-bar
        id="primary-tab-bar"
        @MDCTabBar:activated=${this.changeTab}
        slot=${ifDefined(slot)}
      >
        ${tabTemplates}
      </mwc-tab-bar>`;
    }

    protected renderTabbedContent(content: T) {
      return html``;
    }
  }
  return TabsMix;
};
