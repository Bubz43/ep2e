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

  @internalProperty() private indexesToRestore?: number[] = [];

  @property({ attribute: false }) proxy!: ActorProxy;

  private saveRestoreIndex(ev: SelectedEvent) {
    if (isEventMulti(ev)) {
      this.indexesToRestore = [...ev.detail.index];
    }
  }

  private restoreItems() {
    const toAdd: ItemEntity[] = [];
    const { itemTrash } = this.proxy.actor;
    const newTrash = new Set(itemTrash);
    for (const index of this.indexesToRestore || []) {
      const item = itemTrash[index];
      newTrash.delete(item);
      toAdd.push(item);
    }
    this.proxy.actor.itemTrash = [...newTrash];
    this.proxy.itemOperations.add(...toAdd);
    this.indexesToRestore = [];
  }

  private emptyTrash() {
    this.proxy.actor.itemTrash = [];
    this.requestUpdate();
  }

  render() {
    return html`
      <mwc-list multi @selected=${this.saveRestoreIndex} class="restore-menu">
        ${this.proxy.actor.itemTrash.map((data) => {
          const { agent } = new ItemEP(data, {});
          return html`
            <mwc-check-list-item twoline left>
              <span>${agent.fullName}</span>
              <span slot="secondary">${localize(agent.type)}</span>
            </mwc-check-list-item>
          `;
        })}
        <li divider></li>
        <mwc-list-item
          graphic="avatar"
          ?disabled=${!notEmpty(this.indexesToRestore)}
          @click=${this.restoreItems}
          class="restore-commit"
        >
          <mwc-icon slot="graphic">restore</mwc-icon>
          <span>${localize('restore')}</span>
        </mwc-list-item>
      </mwc-list>
      ${notEmpty(this.proxy.itemTrash)
        ? html`<delete-button
            data-tooltip="${localize('empty')} ${localize('itemTrash')}"
            @mouseover=${tooltip.fromData}
            @focus=${tooltip.fromData}
            @delete=${this.emptyTrash}
          ></delete-button>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-trash': ItemTrash;
  }
}
