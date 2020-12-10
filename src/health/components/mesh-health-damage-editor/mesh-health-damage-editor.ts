import { customElement, LitElement, property, html } from "lit-element";
import styles from "./mesh-health-damage-editor.scss";

@customElement("mesh-health-damage-editor")
export class MeshHealthDamageEditor extends LitElement {
  static get is() {
    return "mesh-health-damage-editor" as const;
  }

  static styles = [styles];

  
}

declare global {
  interface HTMLElementTagNameMap {
    "mesh-health-damage-editor": MeshHealthDamageEditor;
  }
}
