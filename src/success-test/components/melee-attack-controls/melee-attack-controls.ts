import type { MeleeAttackTest } from "@src/success-test/melee-attack-test";
import { customElement, LitElement, property, html, internalProperty } from "lit-element";
import styles from "./melee-attack-controls.scss";

@customElement("melee-attack-controls")
export class MeleeAttackControls extends LitElement {
    static get is() {
        return "melee-attack-controls" as const;
    }

    static get styles() {
         return [styles];
    }

    @internalProperty() private test!: MeleeAttackTest;

    render() {
        return html`
            
        `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        "melee-attack-controls": MeleeAttackControls;
    }
}
