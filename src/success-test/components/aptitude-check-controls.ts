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

  render() {
  
    return html`
    <style>
      .things {
        color: rgba(0, 0, 0, 0)
      }
    </style>
    `
  }
  
}

declare global {
  interface HTMLElementTagNameMap {
    "aptitude-check-controls": AptitudeCheckControls;
  }
}
