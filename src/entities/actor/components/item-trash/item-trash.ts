import { isEventMulti } from '@material/mwc-list';
import type { SelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import type { ActorProxy } from '@src/entities/actor/actor';
import { ItemEP, ItemProxy } from '@src/entities/item/item';
import type { ItemEntity } from '@src/entities/models';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import styles from './item-trash.scss';

@customElement('item-trash')
export class ItemTrash extends LitElement {
  static get is() {
    return 'item-trash' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) proxy!: ActorProxy;

  @internalProperty() private indexesToRestore?: number[] = [];

  private saveRestoreIndex(ev: SelectedEvent) {
    if (isEventMulti(ev)) {
      this.indexesToRestore = [...ev.detail.index];
    }
  }

  private async restoreItems() {
    const toAdd: ItemEntity[] = [];
    const { itemTrash } = this.proxy.actor;
    const newTrash = new Set(itemTrash);
    for (const index of this.indexesToRestore || []) {
      const item = itemTrash[index];
      if (item) {
        newTrash.delete(item);
        toAdd.push(item);
      }
    }
    this.proxy.actor.itemTrash = [...newTrash];
    await this.proxy.itemOperations.add(...toAdd);
    this.indexesToRestore = [];
    this.emitTrashChanged();
  }

  private emptyTrash() {
    this.proxy.actor.itemTrash = [];
    this.emitTrashChanged();
    this.requestUpdate();
  }

  private emitTrashChanged() {
    this.dispatchEvent(
      new CustomEvent('trash-changed', { bubbles: true, composed: true }),
    );
  }

  render() {
    return html`
      <mwc-list multi @selected=${this.saveRestoreIndex} class="restore-menu">
        ${this.proxy.actor.itemTrash.map((data) => {
          const { proxy: agent } = new ItemEP(data, {});
          return html`
            <mwc-check-list-item>
              <span
                >${agent.fullName}
                <span class="type">${localize(agent.type)}</span>
              </span>
            </mwc-check-list-item>
          `;
        })}
        <li divider></li>
        <mwc-list-item
          graphic="icon"
          ?disabled=${!notEmpty(this.indexesToRestore)}
          @click=${this.restoreItems}
          class="restore-commit"
        >
          <mwc-icon slot="graphic">restore</mwc-icon>
          <span>${localize('restore')}</span>
        </mwc-list-item>
        ${notEmpty(this.proxy.itemTrash) && !notEmpty(this.indexesToRestore)
          ? html` <li divider></li>
              <mwc-list-item
                graphic="icon"
                @delete=${this.emptyTrash}
                @click=${this.emptyTrash}
              >
                <mwc-icon slot="graphic">delete_forever</mwc-icon>
                <span>${localize('empty')} ${localize('itemTrash')}</span>
              </mwc-list-item>`
          : ''}
      </mwc-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-trash': ItemTrash;
  }
}
