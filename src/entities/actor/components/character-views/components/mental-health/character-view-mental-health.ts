
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import type { Character } from '@src/entities/actor/proxies/character';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { hardeningTypes, MentalHealth } from '@src/health/mental-health';
import { customElement, LitElement, property, html } from 'lit-element';
import { range } from 'remeda';
import styles from './character-view-mental-health.scss';

@customElement('character-view-mental-health')
export class CharacterViewMentalHealth extends UseWorldTime(LitElement) {
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
    const { timeSinceHealAttempt } = this.health;
    // TODO show natural heals and attempt them
    return html`
     
      <character-view-drawer-heading
        >${localize('mentalHealth')}</character-view-drawer-heading
      >

      <mwc-button
        @click=${this.openHealthEditor}
        >${localize('heal')} / ${localize('damage')}</mwc-button
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
                      @click=${() =>
                        this.health.updateHardening(
                          type,
                          checked ? place : place + 1,
                        )}
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

      <sl-group label=${localize('timeSinceStressAccrued')}
        >${prettyMilliseconds(this.health.timeSinceLastStress)}</sl-group
      >
      ${timeSinceHealAttempt !== null
        ? html`
            <sl-group label=${localize('timeSinceNaturalHealAttempt')}
              >${prettyMilliseconds(timeSinceHealAttempt)}</sl-group
            >
          `
      : ''}
        
        <section>
        <sl-header heading=${localize("naturalHeal")}></sl-header>
        </section>

      <sl-details summary=${localize('history')}>
        <health-log
          .health=${this.character.ego.mentalHealth}
          ?disabled=${this.character.disabled}
        ></health-log>
      </sl-details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-mental-health': CharacterViewMentalHealth;
  }
}
