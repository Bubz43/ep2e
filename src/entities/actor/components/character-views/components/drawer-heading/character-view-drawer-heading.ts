import { customElement, LitElement, property, html } from "lit-element";
import styles from "./character-view-drawer-heading.scss";

/**
 * @slot 
 */
@customElement("character-view-drawer-heading")
export class CharacterViewDrawerHeading extends LitElement {
  static get is() {
    return "character-view-drawer-heading" as const;
  }

  static styles = [styles];

  @property({ type: String }) heading = "";

  render() {
    return html`
      <h3><slot>${this.heading}</slot></h3>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "character-view-drawer-heading": CharacterViewDrawerHeading;
  }
}
