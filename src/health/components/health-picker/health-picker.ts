import { customElement, LitElement, property, html } from "lit-element";
import styles from "./health-picker.scss";

@customElement("health-picker")
export class HealthPicker extends LitElement {
  static get is() {
    return "health-picker" as const;
  }

  static styles = [styles];

  
}

declare global {
  interface HTMLElementTagNameMap {
    "health-picker": HealthPicker;
  }
}
