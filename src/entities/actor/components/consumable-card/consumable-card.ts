import { createMessage } from '@src/chat/create-message';
import { renderNumberField } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import { ItemType } from '@src/entities/entity-types';
import type { ConsumableItem } from '@src/entities/item/item';
import { itemMenuOptions } from '@src/entities/item/item-views';
import { Substance } from '@src/entities/item/proxies/substance';
import { prettyMilliseconds } from '@src/features/time';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { clickIfEnter } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import { customElement, LitElement, property, html } from 'lit-element';
import { stopEvent } from 'weightless';
import styles from './consumable-card.scss';

@customElement('consumable-card')
export class ConsumableCard extends LazyRipple(LitElement) {
  static get is() {
    return 'consumable-card' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) item!: ConsumableItem;

  @property({ type: Boolean, reflect: true }) expanded = false;

  @property({ type: Boolean, reflect: true }) noAnimate = false;

  @property({ type: Boolean }) animateInitial = false;

  @property({ type: Boolean }) allowDrag = false;

  firstUpdated() {
    this.addEventListener('dragend', () => this.handleRippleDeactivate());
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
    openMenu({
      header: { heading: this.item.fullName },
      content: itemMenuOptions(this.item),
      position: ev.currentTarget === this ? ev : undefined,
    });
  }

  private openSubstanceuseMenu(ev: MouseEvent) {
    const { item } = this;
    if (item.type === ItemType.Substance) {
      if (item.applicationMethods.length === 1)
        item.use(item.applicationMethods[0]!);
      else
        openMenu({
          header: { heading: `${localize('use')} ${item.name}` },
          content: item.applicationMethods.map((method) => ({
            label: `${localize(method)} - ${localize(
              'onset',
            )}: ${prettyMilliseconds(Substance.onsetTime(method))}`,
            callback: () => item.use(method),
          })),
          position: ev,
        });
    }
  }

  private addictionTest() {
    if (this.item.type === ItemType.Substance) {
      notify(NotificationType.Info, `TODO WIL Check`);
    }
  }


  render() {
    const { item } = this;
    const { nonDefaultImg, editable } = item;
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
          ? html` <img class="icon" height="32px" src=${nonDefaultImg} /> `
          : ''}

        <span class="info">
          <span class="name">${item.fullName}</span>
          <span class="type">${item.fullType}</span>
        </span>

        <span class="buttons">
          ${item.stashed
            ? html`
                <mwc-icon-button
                
                  @click=${() => item.toggleStashed()}
                  icon=${item.stashed ? 'unarchive' : 'archive'}
                  ?disabled=${!editable}
                ></mwc-icon-button>
              `
            : item.type === ItemType.Substance
            ? html`
                ${item.isAddictive
                  ? html`
                      <mwc-icon-button
                        @click=${this.addictionTest}
                        ?disabled=${!editable}
                        data-tooltip="${localize('addiction')} ${localize(
                          'test',
                        )}"
                        @mouseover=${tooltip.fromData}
                      >
                        <img
                          src=${localImage('icons/actions/chained-heart.svg')}
                        />
                      </mwc-icon-button>
                    `
                  : ''}
                <mwc-icon-button
                  @click=${this.openSubstanceuseMenu}
                  ?disabled=${!editable || item.quantity === 0}
                  data-tooltip=${localize('use')}
                  @mouseover=${tooltip.fromData}
                  ><img src=${localImage('icons/actions/pill-drop.svg')} />
                </mwc-icon-button>
              `
            : ''}
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
            ${item.type !== ItemType.Substance || !item.appliedState ? renderAutoForm({
              classes: 'quantity-form',
              disabled: !editable,
              props: { quantity: item.quantity },
              update: item.updateQuantity.commit,
              fields: ({ quantity }) => renderNumberField(quantity, { min: 0 }),
            }) : ""}
            <enriched-html
              class="description"
              .content=${item.description ||
              `<p>${localize('no')} ${localize('description')}</p>`}
            ></enriched-html>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'consumable-card': ConsumableCard;
  }
}
