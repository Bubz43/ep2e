import { resizeObsAvailable } from '@src/utility/dom';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  eventOptions,
  html,
  internalProperty,
  LitElement,
  property,
  query,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { first } from 'remeda';
import styles from './entity-form-layout.scss';

/**
 * @slot header
 * @slot sidebar
 * @slot details
 * @slot description
 * @slot tabs
 * @slot drawer-content
 */
@customElement('entity-form-layout')
export class EntityFormLayout extends LitElement {
  static get is() {
    return 'entity-form-layout' as const;
  }

  static styles = [styles];

  @property({ type: Boolean }) noDescription = false;

  @property({ type: Boolean }) noScroll = false;

  @property({ type: Boolean, reflect: true }) noSidebar = false;

  @internalProperty() private hideScroll = false;

  @internalProperty() private drawerOpen = false;

  @query('.drawer', true) drawer!: HTMLElement;

  private resizeObs?: ResizeObserver;

  private allowDrawerClose = false;

  async connectedCallback() {
    super.connectedCallback();
    await this.updateComplete;
    if (resizeObsAvailable) {
      const host = this.getHost();
      if (host) {
        this.resizeObs = new ResizeObserver(([entry]) => {
          requestAnimationFrame(() => {
            const { offsetHeight, scrollHeight } = entry.target as HTMLElement;
            this.hideScroll = offsetHeight < scrollHeight;
          });
        });
        this.resizeObs.observe(host);
      }
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.resizeObs?.disconnect();
  }

  private getHost() {
    return (this.getRootNode() as ShadowRoot | undefined)?.host as
      | HTMLElement
      | undefined;
  }

  firstUpdated() {
    requestAnimationFrame(() => {
      first(
        this.renderRoot
          .querySelector<HTMLSlotElement>('slot[name="tabs"]')
          ?.assignedElements() || [],
      )?.animate(
        { transform: ['translateY(-100%)', 'translateY(0)'] },
        { duration: 800, easing: 'ease-out' },
      );
    });
  }

  private toggleDrawer(ev: Event) {
    const slot = ev.currentTarget as HTMLSlotElement;
    this.drawerOpen = notEmpty(slot.assignedElements({ flatten: true }));
    if (this.drawerOpen) this.allowDrawerClose = false;
  }

  private handleTransitionEnd() {
    if (this.drawerOpen === false) {
      this.dispatchEvent(
        new CustomEvent('drawer-close', { bubbles: true, composed: true }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent('drawer-open', { bubbles: true, composed: true }),
      );
      this.allowDrawerClose = true;
    }
  }
  private closeDrawer() {
    if (this.allowDrawerClose) this.drawerOpen = false;
  }

  @eventOptions({ capture: true })
  private closeDrawerOnEscape(ev: KeyboardEvent) {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      this.closeDrawer();
    }
  }

  render() {
    return html`
    <slot name="header"></slot>
      ${this.noSidebar
        ? ''
        : html`
            <aside class="sidebar">
              <slot name="sidebar"></slot>
            </aside>
          `}

      <slot name="tabs"></slot>
      <section
        class="content ${classMap({
          'no-scroll': this.hideScroll || this.noScroll,
        })}"
      >
        <slot name="details"></slot>
        ${this.noDescription ? '' : html` <slot name="description"></slot> `}
      </section>
      <aside class="drawer ${classMap({ open: this.drawerOpen })}">
        <div class="shim" @click=${this.closeDrawer}></div>
        <div
          class="drawer-content"
          @transitionend=${this.handleTransitionEnd}
          @keydown=${this.closeDrawerOnEscape}
        >
          ${this.drawerOpen
            ? html`<mwc-icon-button
                icon="close"
                class="drawer-closer"
                @click=${this.closeDrawer}
              ></mwc-icon-button>`
            : ''}
          <slot @slotchange=${this.toggleDrawer} name="drawer-content"></slot>
        </div>
      </aside>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'entity-form-layout': EntityFormLayout;
  }
}
