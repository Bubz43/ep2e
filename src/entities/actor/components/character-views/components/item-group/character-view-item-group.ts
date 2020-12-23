import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import type { Character } from '@src/entities/actor/proxies/character';
import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { renderItemCard } from '@src/entities/item/item-views';
import type { Trait } from '@src/entities/item/proxies/trait';
import { idProp } from '@src/features/feature-helpers';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
  setDragDrop,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { performIntegerSort } from '@src/foundry/misc-helpers';
import { tooltip } from '@src/init';
import { throttle } from '@src/utility/decorators';
import { clickIfEnter, notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { nothing } from 'lit-html';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { reject } from 'remeda';
import { ItemGroup } from '../../character-view-base';
import { ItemCardBase } from '../cards/item-card-base';
import styles from './character-view-item-group.scss';

const isTemporary = (item: ItemProxy) => !!(item as Trait).temporary;

const sortItems = (a: ItemProxy, b: ItemProxy): number => {
  const tempA = isTemporary(a);
  const tempB = isTemporary(b);
  if (tempA && !tempB) return -1;
  if (tempB && !tempA) return 1;
  if (tempA && tempB) return a.name.localeCompare(b.name);
  return a.sort - b.sort;
};

/**
 * @part header
 */
@customElement('character-view-item-group')
export class CharacterViewItemGroup extends LazyRipple(LitElement) {
  static get is() {
    return 'character-view-item-group' as const;
  }

  static styles = [styles];

  @property({ type: String }) group!: ItemGroup;

  @property({ attribute: false }) character!: Character;

  @property({ type: Boolean }) collapsed = false;

  @internalProperty() private dragTargetItem: ItemProxy | null = null;

  @internalProperty() private sortAfter = false;

  @internalProperty() private allowSort = false;

  private draggedItem: ItemProxy | null = null;

  private cardRects = new Map<ItemCardBase, DOMRect>();

  private droppedOnSelf = false;

  private hasExpanded = false;

  disconnectedCallback() {
    this.resetDraggedItems();
    super.disconnectedCallback();
  }

  update(changedProps: PropertyValues) {
    if (changedProps.has('character')) {
      this.resetDraggedItems();
      if (this.allowSort && this.character.disabled) this.allowSort = false;
    }
    super.update(changedProps);
  }

  updated(changedProps: PropertyValues) {
    if (!this.hasExpanded && !this.collapsed) this.hasExpanded = true;
    super.updated(changedProps);
  }

  private toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  private toggleAllowSort(ev: Event) {
    ev.stopPropagation();
    this.allowSort = !this.allowSort;
  }

  private resetDraggedItems() {
    this.draggedItem = null;
    this.dragTargetItem = null;
    this.sortAfter = false;
    this.droppedOnSelf = false;
    this.cardRects.clear();
  }

  get items() {
    return this.character[this.group] as ItemProxy[];
  }

  get sorted() {
    const sorted = [...this.items].sort(sortItems);
    if (
      this.draggedItem !== this.dragTargetItem &&
      this.draggedItem &&
      this.dragTargetItem
    ) {
      let currentIndex = -1;
      let newIndex = -1;
      for (let index = 0, { length } = sorted; index < length; index++) {
        const item = sorted[index];
        if (item === this.draggedItem) currentIndex = index;
        else if (item === this.dragTargetItem) newIndex = index;
      }
      if (newIndex !== -1 && currentIndex !== -1) {
        if (currentIndex < newIndex) newIndex -= 1;
        if (this.sortAfter) newIndex += 1;
        sorted.splice(currentIndex, 1);
        sorted.splice(newIndex, 0, this.draggedItem);
      }
    }
    return sorted;
  }

  private dragItemCard = (ev: DragEvent) => {
    if (!(ev.currentTarget instanceof ItemCardBase)) return;
    if (this.allowSort) {
      this.draggedItem = ev.currentTarget.item;
      ev.currentTarget.addEventListener(
        'dragend',
        () => !this.droppedOnSelf && this.resetDraggedItems(),
        { once: true },
      );
    }
    
    setDragDrop(ev, {
      type: DropType.Item,
      ...this.character.actor.identifiers,
      data: ev.currentTarget.item.data,
    });
  };

  @throttle(20, true)
  private setDragTargetState(ev: DragEvent) {
    if (this.draggedItem) {
      const card = ev.target as ItemCardBase | null;
      const item = card?.item;
      if (
        item &&
        card &&
        item !== this.draggedItem &&
        !isTemporary(item) &&
        this.items.includes(item)
      ) {
        this.dragTargetItem = item;
        let rect = this.cardRects.get(card);
        if (!rect) {
          rect = card.getBoundingClientRect();
          this.cardRects.set(card, rect);
        }
        const { top, height } = rect;
        this.sortAfter = ev.clientY >= top + height / 2;
      }
    }
  }

  private addItem = handleDrop(async ({ ev, data }) => {
    if (this.character.disabled || data?.type !== DropType.Item) {
      ev.preventDefault();
      this.resetDraggedItems();
      return;
    }
    if (this.draggedItem) {
      this.droppedOnSelf = true;
      const { draggedItem, dragTargetItem } = this;

      if (draggedItem && dragTargetItem) {
        const itemsToUpdate = performIntegerSort({
          src: draggedItem,
          target: dragTargetItem,
          siblings: reject(this.items, isTemporary),
          sortBefore: !this.sortAfter,
        }).map(([item, sort]) => ({ _id: item.id, sort }));
        this.character.itemOperations.update(...itemsToUpdate);
      } else this.resetDraggedItems();
      return;
    }

    const { group } = this;
    const proxy = await itemDropToItemProxy(data);
    if (!proxy) {
      ev.preventDefault();
      return;
    }

    if (this.character.hasItemProxy(proxy)) {
      if (group === ItemGroup.Equipped) {
        if ('equipped' in proxy && !proxy.equipped) {
          proxy.toggleEquipped();
        }
      } else if (group === ItemGroup.Stashed) {
        if ('equipped' in proxy && proxy.equipped) {
          proxy.toggleEquipped();
        } else if ('stashed' in proxy && !proxy.stashed) {
          proxy.toggleStashed();
        }
      } else if (
        group === ItemGroup.Consumables &&
        'stashed' in proxy &&
        proxy.stashed
      ) {
        proxy.toggleStashed();
      }
      return;
    }

    if ('equipped' in proxy) {
      const copy = proxy.getDataCopy(true);
      copy.data.state.equipped = group === ItemGroup.Equipped;
      this.character.itemOperations.add(copy);
    } else if ('stashed' in proxy) {
      const copy = proxy.getDataCopy(true);
      copy.data.state.stashed = group === ItemGroup.Stashed;
      this.character.itemOperations.add(copy);
    } else {
      if (proxy.type === ItemType.Sleight || proxy.type === ItemType.Psi) {
        this.character.ego.addNewItemProxy(proxy);
      } else this.character.itemOperations.add(proxy.getDataCopy(true));
    }
  });

  render() {
    const items = this.character[this.group];
    const hasItems = notEmpty(items);
    return html`
      <sl-dropzone @drop=${this.addItem} ?disabled=${this.character.disabled}>
        <sl-header
          heading=${localize(this.group)}
          ?hideBorder=${!hasItems}
          itemCount=${items.length}
          @click=${this.toggleCollapse}
          @focus="${this.handleRippleFocus}"
          @blur="${this.handleRippleBlur}"
          @mousedown="${this.handleRippleMouseDown}"
          @mouseenter="${this.handleRippleMouseEnter}"
          @mouseleave="${this.handleRippleMouseLeave}"
          @keydown=${clickIfEnter}
          tabindex=${hasItems ? 0 : -1}
          part="header"
        >
          ${this.renderInfo()}
          <span slot="action">${this.renderRipple(!hasItems)}</span>
          ${hasItems
            ? html`
                ${this.collapsed || this.character.disabled
                  ? ''
                  : html`
                      <mwc-icon-button
                        @click=${this.toggleAllowSort}
                        slot="action"
                        icon="sort"
                        class="sort-toggle ${this.allowSort ? 'active' : ''}"
                        data-tooltip="${localize('toggle')} ${localize('sort')}"
                        @mouseover=${tooltip.fromData}
                      ></mwc-icon-button>
                    `}
                ${this.renderToggleIcon()}
              `
            : ''}
        </sl-header>
        ${notEmpty(items) ? this.renderItemList() : ''}
      </sl-dropzone>
    `;
  }

  private renderInfo() {
    switch (this.group) {
      case ItemGroup.Stashed:
        return html`<mwc-icon
          slot="info"
          @mouseenter=${tooltip.fromData}
          data-tooltip="Items apply no effects and are not tracked"
          >info</mwc-icon
        >`;

      default:
        return nothing;
    }
  }

  private renderToggleIcon() {
    return html`
      <mwc-icon
        slot="action"
        class="toggle-icon ${classMap({ collapsed: this.collapsed })}"
      >
        keyboard_arrow_down
      </mwc-icon>
    `;
  }

  private renderItemList() {
    return html`
      <sl-animated-list
        class="proxy-list"
        stagger
        skipExitAnimation
        fadeOnly
        @dragover=${this.setDragTargetState}
        ?hidden=${this.collapsed}
      >
        ${repeat(this.sorted, idProp, (proxy) =>
          renderItemCard(proxy, {
            animateInitial: this.hasExpanded,
            allowDrag: true,
            handleDragStart: this.dragItemCard,
          }),
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-item-group': CharacterViewItemGroup;
  }
}
