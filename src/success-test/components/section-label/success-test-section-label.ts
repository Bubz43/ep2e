import { customElement, LitElement, property, html } from "lit-element";
import styles from "./success-test-section-label.scss";

@customElement("success-test-section-label")
export class SuccessTestSectionLabel extends LitElement {
    static get is() {
        return "success-test-section-label" as const;
    }

    static get styles() {
         return [styles];
    }

    render() {
        return html`
            <slot></slot>
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "success-test-section-label": SuccessTestSectionLabel;
    }
}
