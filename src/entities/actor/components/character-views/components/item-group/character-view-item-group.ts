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
import { repeat } from 'lit-html/directives/repeat';
import { prop, reject, sortBy } from 'remeda';
import { ConsumableCard } from '../cards/consumable-card/consumable-card';
import { ItemCard } from '../cards/item-card/item-card';
import { ItemGroup } from '../../character-view-base';
import styles from './character-view-item-group.scss';

const isTemporary = (item: ItemProxy) => !!(item as Trait).temporary;

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

  @internalProperty() private targetItem: ItemProxy | null = null;

  @internalProperty() private addDragAfter = false;

  private draggedItem: ItemProxy | null = null;

  private hasExpanded = false;

  disconnectedCallback() {
    this.resetDraggedItems();
    super.disconnectedCallback();
  }

  updated(changedProps: PropertyValues) {
    if (!this.hasExpanded && !this.collapsed) this.hasExpanded = true;
    super.updated(changedProps);
  }

  private resetDraggedItems() {
    this.draggedItem = null;
    this.targetItem = null;
    this.addDragAfter = false;
  }

  get items() {
    return this.character[this.group] as ItemProxy[];
  }

  get sorted() {
    const sorted = this.items.sort((a, b) => {
      const tempA = isTemporary(a);
      const tempB = isTemporary(b)
      if (tempA && !tempB) return -1;
      if (tempB && !tempA) return 1;
      if (tempA && tempB) return a.name.localeCompare(b.name);
      return (a.sort - b.sort) || a.name.localeCompare(b.name);
    })
    if (
      this.draggedItem &&
      this.targetItem &&
      this.draggedItem !== this.targetItem
    ) {
      let currentIndex = -1;
      let newIndex = -1;
      for (let index = 0, length = sorted.length; index < length; index++) {
        const el = sorted[index];
        if (el === this.draggedItem) currentIndex = index;
        else if (el === this.targetItem) newIndex = index;
      }
      if (newIndex !== -1 && currentIndex !== -1) {
        if (currentIndex < newIndex) newIndex -= 1;
        if (this.addDragAfter) newIndex += 1;
        sorted.splice(currentIndex, 1);
        sorted.splice(newIndex, 0, this.draggedItem);
      }
    }
    return sorted;
  }

  private toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  private dragItemCard = (ev: DragEvent) => {
    // TODO have base item card class
    if (
      ev.currentTarget instanceof ItemCard ||
      ev.currentTarget instanceof ConsumableCard
    ) {
      this.draggedItem = ev.currentTarget.item;
      ev.currentTarget.addEventListener(
        'dragend',
        () => {
          setTimeout(() => {
            this.resetDraggedItems();
          }, 100);
        },
        { once: true },
      );
      setDragDrop(ev, {
        type: DropType.Item,
        ...this.character.actor.identifiers,
        data: ev.currentTarget.item.data,
      });
    }
  };

  @throttle(40, true)
  private setDragBefore(ev: DragEvent) {
    const card = ev.target as ItemCard | null;
    if (this.draggedItem) {
      const item = card?.item;
      if (
        item &&
        card &&
        item !== this.draggedItem &&
        !isTemporary(item) &&
        this.items.includes(item)
      ) {
        this.targetItem = item;
        const { top, height } = card.getBoundingClientRect();
        this.addDragAfter = ev.clientY >= top + height / 2;
      }
    }
  }

  private addItem = handleDrop(async ({ ev, drop, data }) => {
    if (this.character.disabled || data?.type !== DropType.Item) {
      ev.preventDefault();
      return;
    }
    if (this.draggedItem && this.targetItem) {
      if (
        [this.draggedItem, this.targetItem].includes(
          (ev.target as ItemCard).item,
        )
      ) {
        const sortStuff = performIntegerSort({
          src: this.draggedItem,
          target: this.targetItem,
          siblings: reject(this.items, isTemporary),
          sortBefore: !this.addDragAfter,
        });
        const groups = [...sortStuff].map(([item, sort]) => ({
          _id: item.id,
          sort,
        }));
        this.character.itemOperations.update(...groups);
      }

      return;
    }
    const { group } = this;
    const proxy = await itemDropToItemProxy(data);
    if (!proxy) {
      ev.preventDefault();
      return;
    }

    if (this.character.hasItemProxy(proxy)) {
      // TODO sort
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
          ${hasItems ? this.renderCollapseToggle() : ''}
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

  private renderCollapseToggle() {
    return html`
      <mwc-icon slot="action">
        ${this.collapsed ? 'keyboard_arrow_left' : 'keyboard_arrow_down'}
      </mwc-icon>
    `;
  }

  private renderItemList() {
    return cache(
      this.collapsed
        ? html``
        : html`
            <sl-animated-list
              class="proxy-list"
              stagger
              skipExitAnimation
              fadeOnly
              @dragover=${this.setDragBefore}
            >
              ${repeat(this.sorted, idProp, (proxy) =>
                renderItemCard(proxy, {
                  animateInitial: this.hasExpanded,
                  allowDrag: true,
                  handleDragStart: this.dragItemCard,
                }),
              )}
            </sl-animated-list>
          `,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-item-group': CharacterViewItemGroup;
  }
}
