import type { AptitudeCheck } from "@src/success-test/aptitude-check";
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

  @property({ attribute: false }) test!: AptitudeCheck;

  render() {
    const { ego } = this.test

    return html`
      <header>
        
  </header>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "aptitude-check-controls": AptitudeCheckControls;
  }
}
