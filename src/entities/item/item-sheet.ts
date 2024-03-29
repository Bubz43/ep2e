import { SlWindow } from '@src/components/window/window';
import {
  closeWindow,
  openWindow,
  getWindow,
} from '@src/components/window/window-controls';
import { ResizeOption } from '@src/components/window/window-options';
import type {
  EntitySheet,
  EntitySheetOptions,
} from '@src/foundry/foundry-cont';
import { userCan } from '@src/foundry/misc-helpers';
import { debounce } from '@src/utility/decorators';
import { getDefaultItemIcon } from '@src/utility/images';
import { html } from 'lit-html';
import { compact } from 'remeda';
import type { DeepPartial } from 'utility-types';
import type { ItemEP } from './item';
import { renderItemForm } from './item-views';

export class ItemEPSheet implements EntitySheet {
  private unsub: (() => void) | null;
  private actorUnsub?: (() => void) | null;
  private window: SlWindow | null = null;

  constructor(private item: ItemEP) {
    this.unsub = item.subscriptions.subscribe(this, {
      onEntityUpdate: () => this.render(false),
      onSubEnd: () => this.close(),
    });
    if (item.actor) {
      this.actorUnsub = item.actor.subscriptions.subscribe(this, {
        onEntityUpdate: () => this.render(false),
        onSubEnd: () => this.close(),
      });
    }
  }

  get isRendered() {
    return !!this.window?.isConnected;
  }

  get _minimized() {
    return !!this.window?.minimized;
  }

  private get content() {
    return renderItemForm(this.item.proxy);
  }

  render(force: boolean) {
    if (!force && !this.isRendered) return this;
    this.openWindow(force);
    return this;
  }

  maximize() {
    if (this._minimized) this.render(true);
    return this;
  }

  bringToTop() {
    this.openWindow(true);
  }

  async close() {
    this.unsub?.();
    this.unsub = null;
    this.actorUnsub?.();
    this.actorUnsub = null;
    closeWindow(this.item);
    this.window = null;
    return this;
  }

  async submit({
    updateData,
    _id,
  }: {
    updateData: DeepPartial<ItemEP['system']>;
    _id: string;
  }) {
    return this.item.update({ ...updateData, _id }, {});
  }

  private get windowHeaderButtons() {
    const { compendium, id } = this.item;
    return compact([
      compendium &&
        SlWindow.headerButton({
          onClick: async () => {
            await this.close();
            this.item.collection?.importFromCompendium(
              compendium,
              this.item.id,
              this.item.proxy.nonDefaultImg
                ? {}
                : { img: getDefaultItemIcon() },
              { renderSheet: true },
            );
          },
          content: html`<i class="fas fa-download"></i>`,
          disabled: !userCan('ITEM_CREATE'),
        }),
    ]);
  }

  @debounce(1)
  private openWindow(force: boolean) {
    const { win } = openWindow(
      {
        key: this.item,
        content: html`${this.windowHeaderButtons} ${this.content}`,
        name: this.item.proxy.fullName,
        img: this.item.proxy.nonDefaultImg,
        forceFocus: force,
        adjacentEl: !this.isRendered && this.getAdjacentEl(),
      },
      { resizable: ResizeOption.Vertical },
    );
    this.window = win;
  }

  private getAdjacentEl() {
    return (
      (this.item.actor && getWindow(this.item.actor)) ??
      Array.from(
        document.querySelectorAll<HTMLElement>(
          `[data-document-id="${this.item.id}"]`,
        ),
      )
        .reverse()
        .find((element) => !!element.offsetParent)
    );
  }
}
