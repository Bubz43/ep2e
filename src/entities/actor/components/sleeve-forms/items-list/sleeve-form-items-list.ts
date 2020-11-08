import type { ItemProxy } from '@src/entities/item/item';
import { idProp } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { customElement, LitElement, property, html } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { sortBy } from 'remeda';
import styles from './sleeve-form-items-list.scss';

@customElement('sleeve-form-items-list')
export class SleeveFormItemsList extends LitElement {
  static get is() {
    return 'sleeve-form-items-list' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) items!: ItemProxy[];

  @property({ type: String }) label = '';

  private openItemMenu(item: ItemProxy) {
    return (ev: MouseEvent) => {
      openMenu({
        content: [
          {
            label: localize('delete'),
            callback: () => item.deleteSelf?.(),
            icon: html`<mwc-icon>delete</mwc-icon>`,
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
            <li ?data-comma=${index < commaTarget}>
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
    'sleeve-form-items-list': SleeveFormItemsList;
  }
}
