import { createMessage } from '@src/chat/create-message';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas, rollFormula } from '@src/foundry/rolls';
import type { MeshHealth } from '@src/health/full-mesh-health';
import { HealthType } from '@src/health/health';
import {
  formatAutoHealing,
  HealingSlot,
  HealOverTimeTarget,
  Recovery,
} from '@src/health/recovery';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './character-view-mesh-health.scss';

@customElement('character-view-mesh-health')
export class CharacterViewMeshHealth extends UseWorldTime(LitElement) {
  static get is() {
    return 'character-view-mesh-health' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) health!: MeshHealth;

  private openHealthEditor() {
    this.character.openHealthEditor(this.health);
  }

  private async rollHeal(target: HealOverTimeTarget, heal: Recovery) {
    // TODO Account for multiple instances
    await createMessage({
      data: {
        header: { heading: `${heal.source} ${localize('healthRecovery')}` },
        heal: {
          source: heal.source,
          healthType: HealthType.Mesh,
          ...(target === HealOverTimeTarget.Damage
            ? {
                damageFormulas: rollLabeledFormulas([
                  {
                    label: localize('heal'),
                    formula: heal.amount,
                  },
                ]),
              }
            : { wounds: rollFormula(heal.amount)?.total || 0 }),
        },
      },
      // visibility: MessageVisibility.WhisperGM,
      entity: this.character.actor,
    });
    await this.health.logHeal(heal.slot);
  }

  private async rollReboot() {
    const roll = rollFormula('1d6');
    if (roll) {
      await createMessage({
        roll,
        entity: this.character.actor,
        flavor: `${localize('reboot')} ${localize('turns')}`,
      });
      this.health.setRebootTime(roll.total);
    }
  }

  private reboot() {
    this.health.reboot();
  }

  render() {
    const { health } = this;
    const { regenState, recoveries, isCrashed, timeToReboot } = health;
    // TODO Account for passing intervals
    // TODO Conditions
    return html`
      <character-view-drawer-heading
        >${localize('meshHealth')}</character-view-drawer-heading
      >

      <health-item .health=${health}></health-item>

      <mwc-button
        class="heal-damage"
        icon="launch"
        @click=${this.openHealthEditor}
        >${localize('heal')} / ${localize('damage')}</mwc-button
      >

      <health-state-form .health=${health}></health-state-form>

      ${isCrashed
        ? html`
            <div class="crash-state">
            ${timeToReboot === null ? html` <mwc-button
                    label="${localize('start')} ${localize('reboot')}"
                    @click=${this.rollReboot}
                    ?disabled=${this.character.disabled}
                  ></mwc-button>` : timeToReboot <= 0 ? html`
                  <mwc-button unelevated @click=${this.reboot}>${localize("reboot")}</mwc-button>
                  ` : html` <sl-group label=${localize('timeToReboot')}
                    >${prettyMilliseconds(timeToReboot)}</sl-group
                  >`}
        
            </div>
          `
        : ''}

      <section>
        <sl-header heading=${localize('recovery')}> </sl-header>
        ${enumValues(HealOverTimeTarget).map((target) => {
          const heals = recoveries[target];
          return notEmpty(heals)
            ? html`
                <figure>
                  <figcaption>${localize(target)}</figcaption>
                  <ul>
                    ${enumValues(HealingSlot).map((slot) => {
                      const heal = heals.get(slot);
                      return heal
                        ? html`
                            <wl-list-item
                              ?disabled=${this.character.disabled}
                              clickable
                              @click=${() => this.rollHeal(target, heal)}
                            >
                              <span slot="before">${heal.source}</span>
                              <span>${formatAutoHealing(heal)} </span>
                              ${regenState === target
                                ? html`
                                    <span slot="after">
                                      ${localize('tick')} ${localize('in')}
                                      ${prettyMilliseconds(heal.timeToTick)}
                                    </span>
                                  `
                                : ''}
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
    'character-view-mesh-health': CharacterViewMeshHealth;
  }
}
