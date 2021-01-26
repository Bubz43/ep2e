import type { SpecialTestData, SuccessTestMessageData } from "@src/chat/message-data";
import { localize } from "@src/foundry/localization";
import { customElement, LitElement, property, html } from "lit-element";
import styles from "./message-special-test.scss";

@customElement("message-special-test")
export class MessageSpecialTest extends LitElement {
    static get is() {
        return "message-special-test" as const;
    }

    static get styles() {
         return [styles];
    }

    @property({ type: Object }) successTest!: SuccessTestMessageData;

    @property({ type: Object }) specialTest!: SpecialTestData;

    render() {
        return html` <p>${localize(this.specialTest.type)}</p> `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "message-special-test": MessageSpecialTest;
    }
}
