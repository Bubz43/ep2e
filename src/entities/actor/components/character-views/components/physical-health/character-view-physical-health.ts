import { createMessage, MessageVisibility } from '@src/chat/create-message';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import type { Infomorph } from '@src/entities/actor/proxies/infomorph';
import type { Sleeve } from '@src/entities/actor/sleeves';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { rollFormula, rollLabeledFormulas } from '@src/foundry/rolls';
import type { BiologicalHealth } from '@src/health/biological-health';
import { HealthType } from '@src/health/health';
import {
  DotOrHotTarget,
  formatAutoHealing,
  HealingSlot,
  Recovery,
  RecoveryConditions,
} from '@src/health/recovery';
import type { SyntheticHealth } from '@src/health/synthetic-health';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './character-view-physical-health.scss';

@customElement('character-view-physical-health')
export class CharacterViewPhysicalHealth extends UseWorldTime(LitElement) {
  static get is() {
    return 'character-view-physical-health' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({ attribute: false }) sleeve!: Exclude<Sleeve, Infomorph>;

  @property({ attribute: false }) health!: BiologicalHealth | SyntheticHealth;

  private openHealthEditor() {
    this.character.openHealthEditor(this.health);
  }

  private async rollHeal(target: DotOrHotTarget, heal: Recovery) {
    // TODO Account for multiple instances
    await createMessage({
      data: {
        header: { heading: localize('healthRecovery') },
        heal: {
          source: heal.source,
          healthType: HealthType.Physical,
          ...(target === DotOrHotTarget.Damage
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
      visibility: MessageVisibility.WhisperGM,
    });
    await this.health.logHeal(heal.slot);
  }

  private recoveryConditionsMenu() {
    openMenu({
      header: { heading: `${localize("recovery")} ${localize("conditions")}` },
      content: enumValues(RecoveryConditions).map(condition => ({
        label: localize(condition),
        callback: () => this.sleeve.updateRecoveryConditions(condition),
      }))
    })
  }

  render() {
    const { health } = this;
    const { regenState, recoveries } = health;
    // TODO Account for passing intervals
    // TODO Conditions
    return html`
      <character-view-drawer-heading
        >${localize('physicalHealth')}</character-view-drawer-heading
      >
      <health-state-form .health=${health}></health-state-form>

      <mwc-button @click=${this.openHealthEditor}
        >${localize('heal')} / ${localize('damage')}</mwc-button
      >

      <section>
        <sl-header heading=${localize('recovery')}>
          <mwc-button dense slot="action" @click=${this.recoveryConditionsMenu}>${localize(this.sleeve.recoveryConditions)} ${localize("conditions")}</mwc-button>
        </sl-header>
        ${enumValues(DotOrHotTarget).map((target) => {
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

      <section>
        <sl-header heading=${localize('damageOverTime')}>
          <mwc-icon-button icon="add" slot="action"></mwc-icon-button>
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
