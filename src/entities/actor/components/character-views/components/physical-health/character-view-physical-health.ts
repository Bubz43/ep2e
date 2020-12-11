import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import type { BiologicalHealth } from '@src/health/biological-health';
import { DotOrHotTarget, HealingSlot } from '@src/health/recovery';
import type { SyntheticHealth } from '@src/health/synthetic-health';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './character-view-physical-health.scss';

@customElement('character-view-physical-health')
export class CharacterViewPhysicalHealth extends LitElement {
  static get is() {
    return 'character-view-physical-health' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) health!: BiologicalHealth | SyntheticHealth;

  private openHealthEditor() {
    this.character.openHealthEditor(this.health);
  }

  render() {
    const { health } = this;
    const { regenState } = health;
    return html`
      <character-view-drawer-heading
        >${localize('physicalHealth')}</character-view-drawer-heading
      >
      <health-state-form .health=${health}></health-state-form>

      <mwc-button @click=${this.openHealthEditor}
        >${localize('heal')} / ${localize('damage')}</mwc-button
      >


      <section>
        <sl-header heading=${localize('recovery')}></sl-header>
        ${enumValues(DotOrHotTarget).map((target) => {
          const heals = health.recoveries[target];
          return notEmpty(heals)
            ? html`
                <figure>
                  <figcaption>${localize(target)}</figcaption>
                  <ul>
                    ${enumValues(HealingSlot).map((slot) => {
                      const heal = heals.get(slot);
                      return heal
                        ? html`
                            <wl-list-item>
                              <span slot="before">${heal.source}</span>
                              <span
                                >${heal.amount}
                                ${localize('per').toLocaleLowerCase()}
                                ${prettyMilliseconds(heal.interval)}</span
                              >
                              ${regenState === target ? html`
                              <span slot="after">
                                
                              </span>
                              ` : ""}
                            </wl-list-item>
                          `
                        : '';
                    })}
                  </ul>
                </figure>
              `
            : '';
        })}
      </section>

      <section>
        <sl-header heading=${localize('damageOverTime')}>
          <mwc-icon-button icon="add"></mwc-icon-button>
        </sl-header>
      </section>

      <sl-details summary=${localize('history')}>
        <health-log
          .health=${health}
          ?disabled=${this.character.disabled}
        ></health-log>
      </sl-details>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-physical-health': CharacterViewPhysicalHealth;
  }
}
