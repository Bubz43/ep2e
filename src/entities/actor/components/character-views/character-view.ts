import type { TabBar } from '@material/mwc-tab-bar';
import type { DropZone } from '@src/components/dropzone/dropzone';
import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { idProp } from '@src/features/feature-helpers';
import {
  DropType,
  handleDrop,
  itemDropToItemProxy,
  setDragSource,
} from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, PropertyValues, query } from 'lit-element';
import { nothing } from 'lit-html';
import { cache } from 'lit-html/directives/cache';
import { classMap } from 'lit-html/directives/class-map';
import { repeat } from 'lit-html/directives/repeat';
import { first, prop, sortBy } from 'remeda';
import { stopEvent } from 'weightless';
import { CharacterDrawerRenderer } from './character-drawer-render-event';
import { CharacterViewBase } from './character-view-base';
import styles from './character-view.scss';

const tabs = ['status', 'combat', 'psi'] as const;

enum ItemGroup {
  Traits,
  Consumables,
  Stashed,
  Equipped,
}

@customElement('character-view')
export class CharacterView extends CharacterViewBase {
  static get is() {
    return 'character-view' as const;
  }

  static styles = [styles];

  @query('.tabbed-content')
  tabbedSection!: HTMLElement;

  @query('#primary-tabs')
  tabBar?: TabBar;

  updated(changedProps: PropertyValues) {
    const { tabBar } = this;
    if (tabBar) {
      requestAnimationFrame(() => {
        const tabElements = [...tabBar.querySelectorAll('mwc-tab')];
        const activeElement = tabElements[tabBar.activeIndex];
        if (!activeElement?.active) first(tabElements)?.click();
      });
    }
    super.updated(changedProps);
  }

  private changeTab() {
    this.requestUpdate();
  }

  private get tabbedContent() {
    const index = this.tabBar?.activeIndex || 0;
    switch (tabs[index]) {
      case 'psi':
        return this.renderPsi();

      case 'combat':
        return this.renderCombat();

      case 'status':
      default:
        return this.renderStatus();
    }
  }

  private addItem = handleDrop(async ({ ev, data }) => {
    if (this.character.disabled || data?.type !== DropType.Item) {
      ev.preventDefault();
      return;
    }
    const dropzone = ev.currentTarget as DropZone;
    const group = Number(dropzone.dataset.group) as ItemGroup;
    const proxy = await itemDropToItemProxy(data);
    if (!proxy) {
      ev.preventDefault();
      return;
    }

    if (this.character.hasItemProxy(proxy)) {
      // TODO sort
      // console.log("owned", proxy)
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
    const showPsi = !!(this.character.psi || notEmpty(this.character.sleights));
    // TODO Disable controls if token is not on scene
    return html`
      <character-view-header
        .character=${this.character}
        .token=${this.token}
      ></character-view-header>

      <div class="side">
        <character-view-ego
          .character=${this.character}
          .ego=${this.character.ego}
        ></character-view-ego>
        ${this.character.sleeve
          ? html`
              <character-view-sleeve
                .character=${this.character}
                .sleeve=${this.character.sleeve}
              ></character-view-sleeve>
            `
          : html`
              <div class="sleeve-select">
                <mwc-button
                  raised
                  ?disabled=${this.character.disabled}
                  label="${localize('select')} ${localize('sleeve')}"
                  @click=${() =>
                    this.toggleDrawerRenderer(CharacterDrawerRenderer.Resleeve)}
                ></mwc-button>
              </div>
            `}
      </div>
      ${this.renderDrawer()}

      <mwc-tab-bar id="primary-tabs" @MDCTabBar:activated=${this.changeTab}>
        ${tabs.map((tab) =>
          showPsi || tab !== 'psi'
            ? html` <mwc-tab label=${localize(tab)}></mwc-tab> `
            : '',
        )}
      </mwc-tab-bar>

      <section class="tabbed-content">${cache(this.tabbedContent)}</section>
    `;
  }

  private renderPsi() {
    return html``;
  }

  private renderCombat() {
    return html``;
  }

  private renderStatus() {
    const { traits, equipped, consumables, stashed, disabled } = this.character;
    return html`
      <div class="item-lists">
        <sl-dropzone
          @drop=${this.addItem}
          ?disabled=${disabled}
          data-group=${ItemGroup.Traits}
        >
          <sl-header
            heading=${localize('traits')}
            ?hideBorder=${traits.length === 0}
            itemCount=${traits.length}
          ></sl-header>
          ${notEmpty(traits) ? this.renderItemList(traits) : ''}
        </sl-dropzone>

        <sl-dropzone
          @drop=${this.addItem}
          ?disabled=${disabled}
          data-group=${ItemGroup.Consumables}
        >
          <sl-header
            heading=${localize('consumables')}
            itemCount=${consumables.length}
          ></sl-header>
          ${this.renderItemList(consumables)}
        </sl-dropzone>

        <sl-dropzone
          @drop=${this.addItem}
          ?disabled=${disabled}
          data-group=${ItemGroup.Equipped}
        >
          <sl-header
            heading=${localize('equipped')}
            itemCount=${equipped.length}
          ></sl-header>
          ${notEmpty(equipped) ? this.renderItemList(equipped) : ''}
        </sl-dropzone>

        <sl-dropzone
          @drop=${this.addItem}
          ?disabled=${disabled}
          data-group=${ItemGroup.Stashed}
        >
          <sl-header heading=${localize('stashed')} itemCount=${stashed.length}>
            <mwc-icon
              slot="info"
              @mouseenter=${tooltip.fromData}
              data-tooltip="Items apply no effects and are not tracked"
              >info</mwc-icon
            >
          </sl-header>
          ${notEmpty(stashed) ? this.renderItemList(stashed) : ''}
        </sl-dropzone>
      </div>
    `;
  }

  private renderItemList(proxies: ItemProxy[]) {
    return html`
      <sl-animated-list class="proxy-list" stagger skipExitAnimation fadeOnly>
        ${repeat(
          sortBy(proxies, prop('fullName')),
          idProp,
          (proxy) => html`<item-card
            ?animateInitial=${!!this.hasUpdated}
            draggable="true"
            @dragstart=${(ev: DragEvent) => {
              setDragSource(ev, {
                type: DropType.Item,
                ...this.character.actor.identifiers,
                data: proxy.data,
              });
            }}
            .item=${proxy}
          ></item-card>`,
        )}
      </sl-animated-list>
    `;
  }

  protected renderDrawer() {
    const { drawerIsOpen } = this;
    return html`
      <focus-trap class="drawer ${classMap({ open: drawerIsOpen })}">
        ${drawerIsOpen
          ? html`
              ${this.renderDrawerContent()}
              <wl-list-item
                role="button"
                class="close-drawer"
                clickable
                @click=${this.closeDrawer}
                ><mwc-icon>close</mwc-icon></wl-list-item
              >
            `
          : nothing}
      </focus-trap>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view': CharacterView;
  }
}
