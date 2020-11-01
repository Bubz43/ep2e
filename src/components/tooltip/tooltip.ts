import { customElement, LitElement, property, html, TemplateResult } from "lit-element";
import { render } from "lit-html";
import { NanoPopPosition, reposition } from "nanopop";
import { addListener } from "weightless";
import styles from "./tooltip.scss";

const leaveEvents = ["mouseleave", "blur"];


@customElement("sl-tooltip")
export class ToolTip extends LitElement {
  static get is() {
    return "sl-tooltip" as const;
  }

  static styles = [styles];

  @property({ type: Boolean, reflect: true }) visible = false;

  private listenerUnsub: (() => void) | null = null;

  private attachedEl?: HTMLElement;

  private interactable = false;

  firstUpdated() {
    this.addEventListener("mouseleave", () => {
      if (!this.attachedEl?.matches(":hover")) this.detach(true);
    });
  }

  attach({
    el,
    content,
    position = "top-start",
    interactable = false,
  }: {
    el: HTMLElement;
    content: TemplateResult | string;
    position?: NanoPopPosition;
    interactable?: boolean;
  }) {
    // TODO Create hovercard component
    this.attachedEl = el;
    this.interactable = interactable;
    if (this.listenerUnsub) this.detach(false);
    render(content, this);
    this.visible = true;
    requestAnimationFrame(() =>
      reposition(el, this, { position, margin: interactable ? 0 : 4 })
    );
    this.listenerUnsub = addListener(el, leaveEvents, this.checkRemove);
  }

  checkRemove = () => {
    if (this.interactable ? !this.matches(":hover") : true) this.detach(true);
  };

  detach(hide: boolean) {
    this.visible = !hide;
    this.listenerUnsub?.();
    this.listenerUnsub = null;
  }

  render() {
    return html` <slot></slot> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "sl-tooltip": ToolTip;
  }
}
