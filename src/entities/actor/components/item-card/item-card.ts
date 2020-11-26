import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { clickIfEnter } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  query,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { noop } from 'remeda';
import styles from './item-card.scss';

@customElement('item-card')
export class ItemCard extends LazyRipple(LitElement) {
  static get is() {
    return 'item-card' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) item!: ItemProxy;

  @property({ type: Boolean, reflect: true }) expanded = false;

  @property({ type: Boolean, reflect: true }) noAnimate = false;

  @property({ type: Boolean }) animateInitial = false;

  @query('.header', true) headerButton!: HTMLElement;

  firstUpdated() {
    this.addEventListener('dragend', () => this.handleRippleDeactivate());
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
        { duration: 750, easing: 'ease-in-out' },
      );
    }
  }

  private toggleExpanded(ev: Event) {
    if (ev.currentTarget !== ev.target) return;
    this.expanded = !this.expanded;
  }

  protected handleRippleMouseDown(ev?: Event) {
    if (ev?.currentTarget !== ev?.target) return;
    super.handleRippleMouseDown(ev);
  }

  private openMenu() {
    openMenu({
      header: { heading: this.item.fullName },
      content: [
        {
          label: localize('form'),
          icon: html`<mwc-icon>launch</mwc-icon>`,
          callback: this.item.openForm ?? noop,
        },
        {
          label: localize('delete'),
          icon: html`<mwc-icon>delete_forever</mwc-icon>`,
          callback: this.item.deleteSelf ?? noop,
        },
      ],
    });
  }

  get textContent() {
    return this.headerButton.textContent || this.item.name;
  }

  set textContent(value: string) {
    this.append(value);
  }

  render() {
    const { item } = this;
    const { nonDefaultImg } = item;
    return html`
      <header
        role="button"
        tabindex="0"
        class="header"
        @keydown=${clickIfEnter}
        @click=${this.toggleExpanded}
        @focus="${this.handleRippleFocus}"
        @blur="${this.handleRippleBlur}"
        @mousedown="${this.handleRippleMouseDown}"
        @mouseenter="${this.handleRippleMouseEnter}"
        @mouseleave="${this.handleRippleMouseLeave}"
      >
        ${nonDefaultImg
          ? html` <img height="32px" src=${nonDefaultImg} /> `
          : ''}

        <span class="info">
          <span class="name">${item.fullName}</span>
          <span class="type">${item.fullType}</span>
        </span>

        <span class="buttons">
          ${item.type === ItemType.Software && item.hasActivation
            ? html`
                <mwc-icon-button
                  class="toggle ${classMap({ activated: item.activated })}"
                  icon="settings_power"
                  @click=${() => item.toggleActivation()}
                ></mwc-icon-button>
              `
            : ''}
          ${item.type === ItemType.PhysicalTech && item.hasToggleActivation
            ? html`
                <mwc-icon-button
                  class="toggle ${classMap({ activated: item.activated })}"
                  icon="power_settings_new"
                  @click=${() => item.toggleActivation()}
                ></mwc-icon-button>
              `
            : ''}
          ${'toggleEquipped' in item
            ? html`
                <mwc-icon-button
                  @click=${() => item.toggleEquipped()}
                  icon=${item.equipped ? 'archive' : 'unarchive'}
                ></mwc-icon-button>
              `
            : 'toggleStashed' in item
            ? html`
                <mwc-icon-button
                  @click=${() => item.toggleStashed()}
                  icon=${item.stashed ? 'unarchive' : 'archive'}
                ></mwc-icon-button>
              `
            : ''}
          <mwc-icon-button
            icon="more_vert"
            @click=${this.openMenu}
          ></mwc-icon-button>
        </span>

        ${this.renderRipple()}
      </header>
      ${this.expanded
        ? html`
            <enriched-html
              class="description"
              content=${item.description ||
              `<p>${localize('no')} ${localize('description')}</p>`}
            ></enriched-html>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-card': ItemCard;
  }
}
