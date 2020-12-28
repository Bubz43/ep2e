import type { PlacedTemplateIDs } from "@src/foundry/canvas";
import { localize } from "@src/foundry/localization";
import { customElement, LitElement, property, html } from "lit-element";
import styles from "./measured-template-editor.scss";

@customElement("measured-template-editor")
export class MeasuredTemplateEditor extends LitElement {
  static get is() {
    return "measured-template-editor" as const;
  }

  static get styles() {
     return [styles];
  }

  @property({ attribute: false }) templateIds?: PlacedTemplateIDs | null;


  render() {
    return html`
      <div class="template">
        <span class="label">${localize('template')}</span>
        
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "measured-template-editor": MeasuredTemplateEditor;
  }
}
