import type { ItemProxy } from '@src/entities/item/item';
import { idProp } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { customElement, html, LitElement, property } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { sortBy } from 'remeda';
import styles from './form-items-list.scss';

@customElement('form-items-list')
export class FormItemsList extends LitElement {
  static get is() {
    return 'form-items-list' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) items!: ItemProxy[];

  @property({ type: String }) label = '';

  @property({ attribute: false }) dragStartHandler?: (
    ev: DragEvent,
    item: ItemProxy,
  ) => void;

  private openItemMenu(item: ItemProxy) {
    return (ev: MouseEvent) => {
      openMenu({
        content: [
          {
            label: localize('delete'),
            callback: () => item.deleteSelf?.(),
            icon: html`<mwc-icon>delete</mwc-icon>`,
            disabled: !item.editable && !item.alwaysDeletable,
          },
        ],
        position: ev,
        header: { heading: item.fullName },
      });
    };
  }

  render() {
    const { items } = this;
    const commaTarget = items.length - 1;
    return html`
      <sl-animated-list class="item-list">
        <li class="label">${this.label}:</li>
        ${repeat(
          sortBy(items, (i) => i.fullName),
          idProp,
          (item, index) => html`
            <li
              ?data-comma=${index < commaTarget}
              draggable=${this.dragStartHandler ? 'true' : 'false'}
              @dragstart=${(ev: DragEvent) => this.dragStartHandler?.(ev, item)}
            >
              <button
                @click=${item.openForm}
                @contextmenu=${this.openItemMenu(item)}
              >
                ${item.fullName.trim()}
              </button>
            </li>
          `,
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'form-items-list': FormItemsList;
  }
}
