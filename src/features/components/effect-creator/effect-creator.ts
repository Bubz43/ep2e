import { customElement, LitElement, property, html } from "lit-element";
import styles from "./effect-creator.scss";

@customElement("effect-creator")
export class EffectCreator extends LitElement {
  static get is() {
    return "effect-creator" as const;
  }

  static styles = [styles];

  
}

declare global {
  interface HTMLElementTagNameMap {
    "effect-creator": EffectCreator;
  }
}
