import { renderNumberField } from "@src/components/field/fields";
import { renderUpdaterForm } from "@src/components/form/forms";
import type { Character } from "@src/entities/actor/proxies/character";
import { localize } from "@src/foundry/localization";
import { hardeningTypes, MentalHealth } from "@src/health/mental-health";
import { customElement, LitElement, property, html } from "lit-element";
import styles from "./character-view-mental-health.scss";

@customElement("character-view-mental-health")
export class CharacterViewMentalHealth extends LitElement {
  static get is() {
    return "character-view-mental-health" as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) health!: MentalHealth;

  private openHealthEditor() {
    this.character.openHealthEditor(this.health);
  }

  render() {
    return html` <section>
    <character-view-drawer-heading
      >${localize('mentalHealth')}</character-view-drawer-heading
    >
    <health-state-form
      .health=${this.character.ego.mentalHealth}
    ></health-state-form>
    <p class="hardening-label">${localize('hardening')}</p>
    ${renderUpdaterForm(
      this.character.ego.updater.prop('data', 'mentalHealth'),
      {
        fields: (hardenings) =>
          hardeningTypes.map((type) =>
            renderNumberField(hardenings[type], { min: 0, max: 5 }),
          ),
      },
    )}

    <mwc-button
      @click=${() =>
        this.character.openHealthEditor(this.character.ego.mentalHealth)}
      >${localize('heal')} / ${localize('damage')}</mwc-button
    >

    <sl-details summary=${localize('history')}>
      <health-log
        .health=${this.character.ego.mentalHealth}
        ?disabled=${this.character.disabled}
      ></health-log>
    </sl-details>
  </section>`
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "character-view-mental-health": CharacterViewMentalHealth;
  }
}
