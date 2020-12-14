import { renderNumberField } from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import type { Character } from '@src/entities/actor/proxies/character';
import { localize } from '@src/foundry/localization';
import { hardeningTypes, MentalHealth } from '@src/health/mental-health';
import { customElement, LitElement, property, html } from 'lit-element';
import { range } from 'remeda';
import styles from './character-view-mental-health.scss';

@customElement('character-view-mental-health')
export class CharacterViewMentalHealth extends LitElement {
  static get is() {
    return 'character-view-mental-health' as const;
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
      <figure>
        <figcaption>${localize('hardening')}</figcaption>
        <ul class="hardening">
          ${hardeningTypes.map((type) => {
            const val = this.health.hardening[type];
            return html`
              <li>
                ${localize(type)}
                <div>
                  ${range(0, 5).map((place) => {
                    const checked = place < val;
                    return html`<mwc-icon-button
                    @click=${() => this.health.updateHardening(type, checked ? place : place + 1)}
                      ?disabled=${this.character.disabled}
                      icon=${checked ? 'check_box' : 'check_box_outline_blank'}
                    ></mwc-icon-button>`;
                  })}
                </div>
              </li>
            `;
          })}
        </ul>
      </figure>
   

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
    </section>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-mental-health': CharacterViewMentalHealth;
  }
}
