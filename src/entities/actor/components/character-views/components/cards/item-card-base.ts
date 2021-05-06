import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import type { Character } from '@src/entities/actor/proxies/character';
import type { ItemProxy } from '@src/entities/item/item';
import { itemMenuOptions } from '@src/entities/item/item-views';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { clickIfEnter } from '@src/utility/helpers';
import { html, LitElement, property, TemplateResult } from 'lit-element';
import styles from './item-card-base-styles.scss';

const rippleStates = ['Hover', 'Press', 'Focus'] as const;

/**
 * @slot unexpanded
 */
export abstract class ItemCardBase extends LazyRipple(LitElement) {
  declare abstract item: ItemProxy;

  abstract renderHeaderButtons(): TemplateResult;

  abstract renderExpandedContent(): TemplateResult;

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @property({ type: Boolean, reflect: true }) expanded = false;

  @property({ type: Boolean, reflect: true }) noAnimate = false;

  @property({ type: Boolean }) animateInitial = false;

  @property({ type: Boolean }) allowDrag = false;

  firstUpdated() {
    this.addEventListener('dragend', () => {
      rippleStates.map((state) =>
        this.rippleHandlers[`end${state}` as const](),
      );
    });
    this.addEventListener('contextmenu', (ev) => this.openMenu(ev));
    if (this.animateInitial) {
      this.animate(
        {
          backgroundColor: [
            `transparent`,
            'var(--color-primary)',
            'var(--color-primary)',
            'var(--color-primary)',
            'transparent',
          ],
        },
        { duration: 1500, easing: 'ease-in-out' },
      );
    }
  }

  protected toggleExpanded(ev: Event) {
    if (ev.currentTarget !== ev.target) return;
    this.expanded = !this.expanded;
  }

  protected handleRippleMouseDown(ev?: Event) {
    if (ev?.currentTarget !== ev?.target) return;
    super.handleRippleMouseDown(ev);
  }

  protected openMenu(ev: MouseEvent) {
    openMenu({
      header: { heading: this.item.fullName },
      content: itemMenuOptions(this.item),
      position: ev.currentTarget === this ? ev : undefined,
    });
  }

  render() {
    const { item } = this;
    const { nonDefaultImg } = item;
    return html`
      <div
        role="button"
        tabindex="0"
        class="header"
        draggable=${this.allowDrag ? 'true' : 'false'}
        @keydown=${clickIfEnter}
        @click=${this.toggleExpanded}
        @focus="${this.handleRippleFocus}"
        @blur="${this.handleRippleBlur}"
        @mousedown="${this.handleRippleMouseDown}"
        @mouseenter="${this.handleRippleMouseEnter}"
        @mouseleave="${this.handleRippleMouseLeave}"
      >
        ${nonDefaultImg
          ? html` <img class="icon" height="31px" src=${nonDefaultImg} /> `
          : ''}

        <span class="info">
          ${'temporary' in item && item.temporary
            ? html`
                <span class="temporary"
                  >${localize('temporary')}
                  <span class="temporary-source">
                    - ${item.temporary}</span
                  ></span
                >
              `
            : ''}
          <!-- ${'vehicleOwner' in item && item.vehicleOwner
            ? html` <span class="vehicle-owner">[${item.vehicleOwner}]</span> `
            : ''} -->
          <span class="name">${item.fullName}</span>
          <span class="type">${item.fullType}</span>
        </span>

        <span class="buttons">
          ${this.renderHeaderButtons()}
          <mwc-icon-button
            class="more"
            icon="more_vert"
            @click=${this.openMenu}
          ></mwc-icon-button>
        </span>

        ${this.renderRipple()}
      </div>

      ${this.expanded
        ? html`
            ${this.renderExpandedContent()}

            <enriched-html
              class="description"
              .content=${this.item.description ||
              `<p>${localize('no')} ${localize('description')}</p>`}
            ></enriched-html>
          `
        : this.renderUnexpandedContent()}
    `;
  }

  protected renderUnexpandedContent() {
    return html`<slot name="unexpanded"></slot>`;
  }
}
