import { LazyRipple } from "@src/components/mixins/lazy-ripple";
import type { ConsumableItem } from "@src/entities/item/item";
import { itemMenuOptions } from "@src/entities/item/item-views";
import { openMenu } from "@src/open-menu";
import { customElement, LitElement, property, html } from "lit-element";
import styles from "./consumable-card.scss";

@customElement("consumable-card")
export class ConsumableCard extends LazyRipple(LitElement) {
  static get is() {
    return "consumable-card" as const;
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

  render() {
    const { item } = this;
    const { nonDefaultImg } = item;
    return html`
      
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "consumable-card": ConsumableCard;
  }
}
