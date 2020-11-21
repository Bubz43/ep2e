import { throttle } from '@src/utility/decorators';
import { internalProperty, LitElement, property, query } from 'lit-element';
import type { TemplateResult } from 'lit-html';
import { traverseActiveElements } from 'weightless';
import type { MaybeToken } from '../../actor';
import type { Character } from '../../proxies/character';

export abstract class CharacterViewBase extends LitElement {
  protected abstract renderDrawer(): TemplateResult;

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) token?: MaybeToken;

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

  protected renderDrawerContent() {
    return this.drawerContentRenderer?.call(this) ?? '';
  }

  @throttle(400, true)
  protected toggleDrawerContent(fn: () => TemplateResult) {
    if (this.drawerContentRenderer === fn) {
      this.closeDrawer();
      if (this.drawerOpener?.isConnected) this.drawerOpener.focus();
    } else {
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
        },
        { once: true },
      );
    } else {
      this.drawerContentRenderer = null;
    }
  }

  get drawerIsOpen() {
    return !!this.drawerContentRenderer;
  }
}
