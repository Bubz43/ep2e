import type { ActorEP, MaybeToken } from "@src/entities/actor/actor";
import type { Ego } from "@src/entities/actor/ego";
import type { FullSkill } from "@src/features/skills";
import { customElement, LitElement, property, html } from "lit-element";
import styles from "./skill-test-controls.scss";

@customElement("skill-test-controls")
export class SkillTestControls extends LitElement {
    static get is() {
        return "skill-test-controls" as const;
    }

    static get styles() {
         return [styles];
    }

    @property({ type: Object }) skill!: FullSkill;

    @property({ attribute: false }) entities!: {
        actor: ActorEP;
        token?: MaybeToken
    }

    // @property({ attribute: false }) getState!: (actor: ActorEP)

}

declare global {
    interface HTMLElementTagNameMap {
        "skill-test-controls": SkillTestControls;
    }
}
