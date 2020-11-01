import type { IconButton } from "@material/mwc-icon-button";
import { debounce } from "@src/utility/decorators";
import { customElement, LitElement, property, html, query } from "lit-element";
import styles from "./delete-button.scss";

@customElement("delete-button")
export class DeleteButton extends LitElement {
  static get is() {
    return "delete-button" as const;
  }

  static styles = [styles];

  @property({ type: Boolean }) disabled = false;

  @property({ reflect: true, type: Boolean }) confirm = false;

  @property({ type: String }) icon = "delete";

  @query("mwc-icon-button")
  iconButton!: IconButton;

  private emitDelete() {
    if (!this.confirm) return;
    this.dispatchEvent(
      new CustomEvent("delete", { bubbles: true, composed: true })
    );
    this.confirm = false;
  }

  @debounce(100)
  private setConfirming() {
    const button = this.iconButton.renderRoot.querySelector("button");
    if (button) {
      button.focus();
      // button.click();
      button.dispatchEvent( new CustomEvent("mousedown", { bubbles: true, composed: true }))
    }
    this.confirm = true;
  }

  private cancelConfirm() {
    this.confirm = false;
  }

  render() {
    return html`
      <div>
        <wl-list-item
          role="button"
          clickable
          ?disabled=${this.disabled}
          @click=${this.setConfirming}
        >
          <mwc-icon>${this.icon}</mwc-icon>
        </wl-list-item>
        <mwc-icon-button
        tabindex="-1"
          icon="delete_forever"
          @click=${this.emitDelete}
          @focusout=${this.cancelConfirm}
        >
        </mwc-icon-button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "delete-button": DeleteButton;
  }
}
