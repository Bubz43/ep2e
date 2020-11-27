import type { Character } from '@src/entities/actor/proxies/character';
import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { idProp } from '@src/features/feature-helpers';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
  setDragDrop,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  LitElement,
  property,
  PropertyValues,
} from 'lit-element';
import { nothing } from 'lit-html';
import { cache } from 'lit-html/directives/cache';
import { repeat } from 'lit-html/directives/repeat';
import { prop, sortBy } from 'remeda';
import { ItemCard } from '../../../item-card/item-card';
import { ItemGroup } from '../../character-view-base';
import styles from './character-view-item-group.scss';

@customElement('character-view-item-group')
export class CharacterViewItemGroup extends LitElement {
  static get is() {
    return 'character-view-item-group' as const;
  }

  static styles = [styles];

  @property({ type: String }) group!: ItemGroup;

  @property({ attribute: false }) character!: Character;

  @property({ type: Boolean }) collapsed = false;

  private hasExpanded = false;

  updated(changedProps: PropertyValues) {
    if (!this.hasExpanded && !this.collapsed) this.hasExpanded = true;
    super.updated(changedProps);
  }

  private toggleCollapse() {
    this.collapsed = !this.collapsed;
  }

  private dragItemCard(ev: DragEvent) {
    if (ev.currentTarget instanceof ItemCard) {
      setDragDrop(ev, {
        type: DropType.Item,
        ...this.character.actor.identifiers,
        data: ev.currentTarget.item.data,
      });
    }
  }

  private addItem = handleDrop(async ({ ev, drop, data }) => {
    if (this.character.disabled || data?.type !== DropType.Item) {
      ev.preventDefault();
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
    return html`
      <sl-dropzone
        @drop=${this.addItem}
        ?disabled=${this.character.disabled}
        data-group=${ItemGroup.Traits}
      >
        <sl-header
          heading=${localize(this.group)}
          ?hideBorder=${items.length === 0}
          itemCount=${items.length}
        >
          ${this.renderInfo()}
          ${notEmpty(items) ? this.renderCollapseToggle() : ''}
        </sl-header>
        ${notEmpty(items) ? this.renderItemList(items) : ''}
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
      <mwc-icon-button
        slot="action"
        icon=${this.collapsed ? 'keyboard_arrow_left' : 'keyboard_arrow_down'}
        @click=${this.toggleCollapse}
      ></mwc-icon-button>
    `;
  }

  private renderItemList(proxies: ItemProxy[]) {
    return cache(
      this.collapsed
        ? html``
        : html`
            <sl-animated-list
              class="proxy-list"
              stagger
              skipExitAnimation
              fadeOnly
            >
              ${repeat(
                sortBy(proxies, prop('fullName')),
                idProp,
                (proxy) => html`<item-card
                  ?animateInitial=${this.hasExpanded}
                  allowDrag
                  @dragstart=${this.dragItemCard}
                  .item=${proxy}
                ></item-card>`,
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
