import { customElement, LitElement, property, html } from "lit-element";
import styles from "./aptitude-check-controls.scss";

@customElement("aptitude-check-controls")
export class AptitudeCheckControls extends LitElement {
  static get is() {
    return "aptitude-check-controls" as const;
  }

  static get styles() {
     return [styles];
  }

  
}

declare global {
  interface HTMLElementTagNameMap {
    "aptitude-check-controls": AptitudeCheckControls;
  }
}
