import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { clickIfEnter } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { compact, noop } from 'remeda';
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

  @property({ type: Boolean }) allowDrag = false;

  firstUpdated() {
    this.addEventListener('dragend', () => this.handleRippleDeactivate());
    this.addEventListener("contextmenu", ev => this.openMenu(ev))
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

  private openMenu(ev: MouseEvent) {
    const { item } = this;
    openMenu({
      header: { heading: item.fullName },
      content: compact([
        'toggleStashed' in item &&
         {
            label: localize(item.stashed ? "carry" : 'stash'),
            callback: item.toggleStashed.bind(item),
          },
        'toggleEquipped' in item &&
          {
            label: localize(item.equipped ? 'unequip' : "equip"),
            callback: item.toggleEquipped.bind(item),
          },
        item.openForm && {
          label: localize('form'),
          icon: html`<mwc-icon>launch</mwc-icon>`,
          callback: item.openForm,
        },
        item.deleteSelf && {
          label: localize('delete'),
          icon: html`<mwc-icon>delete_forever</mwc-icon>`,
          callback: item.deleteSelf,
          disabled: !item.editable && !item.alwaysDeletable,
        },
      ]),
      position: (ev.currentTarget === this ? ev : undefined)
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
          ${'toggleEquipped' in item && !item.equipped
            ? html`
                <mwc-icon-button
                  @click=${() => item.toggleEquipped()}
                  icon=${item.equipped ? 'archive' : 'unarchive'}
                ></mwc-icon-button>
              `
            : 'toggleStashed' in item && item.stashed
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
      </div>
      ${this.expanded
      ? html`
        ${this.item.type === ItemType.PhysicalTech && this.item.hasOnboardALI && this.item.onboardALI?.trackMentalHealth ? html`
        <health-item .health=${this.item.onboardALI.mentalHealth}></health-item>
        ` : ""}
            ${this.item.type === ItemType.PhysicalTech &&
            this.item.fabricatorType
              ? html`<item-card-fabber .fabber=${this.item}></item-card-fabber>`
              : ''}
          `
        : ''}

      <enriched-html
        ?hidden=${!this.expanded}
        class="description"
        content=${item.description ||
        `<p>${localize('no')} ${localize('description')}</p>`}
      ></enriched-html>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-card': ItemCard;
  }
}
