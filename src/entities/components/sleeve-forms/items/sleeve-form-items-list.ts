import type { ItemProxy } from "@src/entities/item/item";
import { localize } from "@src/foundry/localization";
import { openMenu } from "@src/open-menu";
import { customElement, LitElement, property, html } from "lit-element";
import { sortBy } from "remeda";
import styles from "./sleeve-form-items-list.scss";

@customElement("sleeve-form-items-list")
export class SleeveFormItemsList extends LitElement {
  static get is() {
    return "sleeve-form-items-list" as const;
  }

  static styles = [styles];

  @property({ attribute: false }) items!: ItemProxy[];

  @property({ type: String }) label = ""

  render() {
    const { items } = this;
    return html`
    <sl-animated-list class="item-list">
      <li class="label">${this.label}:</li>
      ${sortBy(items, (i) => i.fullName).map(
        (item, index, list) =>
          html`
            <li
              @click=${() => item.openForm?.()}
              @contextmenu=${(ev: MouseEvent) => {
                openMenu({
                  content: [
                    {
                      label: localize('delete'),
                      callback: () => item.deleteSelf?.(),
                      icon: html`<mwc-icon>delete</mwc-icon>`
                    },
                  ],
                  position: ev,
                  header: { heading: item.fullName }
                });
              }}
              ?data-comma=${index < list.length - 1}
            >
              <button>${item.fullName.trim()}</button>
            </li>
          `,
      )}
    </sl-animated-list>
  `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sleeve-form-items-list": SleeveFormItemsList;
  }
}
