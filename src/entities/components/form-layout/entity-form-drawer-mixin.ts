import type { FocusTrap } from '@a11y/focus-trap';
import { LitElement, query, internalProperty } from 'lit-element';
import { TemplateResult, html, nothing } from 'lit-html';
import type { Class } from 'type-fest';

export const FormDrawer = (Base: Class<LitElement>) => {
  class DrawerUser extends Base {
    protected drawerOpener: HTMLElement | null = null;

    @query('focus-trap[slot="drawer-content"]') focusTrap?: FocusTrap;

    private autoFocus = true;

    @internalProperty() protected drawerContentRenderer:
      | (() => TemplateResult)
      | null = null;

    connectedCallback() {
      this.addEventListener('drawer-close', this.closeDrawer);
      this.addEventListener('drawer-open', this.focusDrawerContent);
      super.connectedCallback();
    }

    disconnectedCallback() {
      this.removeEventListener('drawer-close', this.closeDrawer);
      this.removeEventListener('drawer-open', this.focusDrawerContent);
      this.drawerOpener = null;
      this.drawerContentRenderer = null;
      super.disconnectedCallback();
    }

    focusDrawerContent = () => {
      this.autoFocus && this.focusTrap?.focusFirstElement();
    };

    renderDrawerContent() {
      return this.drawerContentRenderer
        ? html`<focus-trap slot="drawer-content">
            ${this.drawerContentRenderer.call(this)}
          </focus-trap>`
        : nothing;
    }

    protected closeDrawer = () => {
      this.drawerContentRenderer = null;
      requestAnimationFrame(() => {
        if (this.drawerOpener?.isConnected) this.drawerOpener.focus();
        this.drawerOpener = null;
      });
    };

    protected setDrawerFromEvent(fn: () => TemplateResult, autoFocus = true) {
      return ({ currentTarget }: Event) => {
        this.drawerOpener = currentTarget as HTMLElement;
        this.drawerContentRenderer = fn;
        this.autoFocus = autoFocus;
      };
    }
  }
  return DrawerUser;
};
