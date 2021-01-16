import type { FavorMessageData } from "@src/chat/message-data";
import { customElement, LitElement, property, html } from "lit-element";
import { MessageElement } from "../message-element";
import styles from "./message-favor.scss";

@customElement("message-favor")
export class MessageFavor extends MessageElement {
    static get is() {
        return "message-favor" as const;
    }

    static get styles() {
         return [styles];
    }

    @property({ type: Object }) favor!: FavorMessageData;

    render() {
        
        return html`
            
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "message-favor": MessageFavor;
    }
}
