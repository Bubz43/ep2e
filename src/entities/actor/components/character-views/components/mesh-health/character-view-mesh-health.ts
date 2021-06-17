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
import { openMenu } from '@src/open-menu';
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

  private async rollHeal(
    target: HealOverTimeTarget,
    heal: Recovery,
    instances: number,
  ) {
    const wholeInstances = Math.floor(instances);
    await createMessage({
      data: {
        header: { heading: `${heal.source} ${localize('healthRecovery')}` },
        heal: {
          source: heal.source,
          healthType: HealthType.Mesh,
          ...(target === HealOverTimeTarget.Damage
            ? {
                damageFormulas: rollLabeledFormulas(
                  Array.from({ length: wholeInstances }).map((_, index) => ({
                    label:
                      instances >= 2
                        ? `${localize('heal')} ${index + 1}`
                        : localize('heal'),
                    formula: heal.amount,
                  })),
                ),
              }
            : {
                wounds: (rollFormula(heal.amount)?.total || 0) * wholeInstances,
              }),
        },
      },
      // visibility: MessageVisibility.WhisperGM,
      entity: this.character.actor,
    });
    await this.health.logHeal(heal.slot, heal.interval * (instances % 1));
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
              ${timeToReboot === null
                ? html` <mwc-button
                    label="${localize('start')} ${localize('reboot')}"
                    @click=${this.rollReboot}
                    ?disabled=${this.character.disabled}
                  ></mwc-button>`
                : timeToReboot <= 0
                ? html`
                    <mwc-button unelevated @click=${this.reboot}
                      >${localize('reboot')}</mwc-button
                    >
                  `
                : html` <sl-group label=${localize('timeToReboot')}
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
                    ${[...heals.values()].map((heal) => {
                      const timeToTick =
                        regenState === target && heal.timeState.remaining;
                      const ready = timeToTick === 0;
                      const instances = Math.abs(
                        (heal.timeState.duration - heal.timeState.elapsed) /
                          heal.timeState.duration -
                          1,
                      );

                      return html`
                        <wl-list-item
                          class="heal ${ready ? 'ready' : ''}"
                          ?disabled=${this.character.disabled}
                          clickable
                          @click=${(ev: MouseEvent) => {
                            if (!timeToTick)
                              this.rollHeal(target, heal, instances);
                            else {
                              openMenu({
                                position: ev,
                                content: [
                                  {
                                    label: `${localize('use')} & ${localize(
                                      'reset',
                                    )} ${localize('time')}`,
                                    callback: () =>
                                      this.rollHeal(target, heal, 1),
                                  },
                                  {
                                    label: localize('use'),
                                    callback: () =>
                                      this.rollHeal(target, heal, instances),
                                  },
                                ],
                              });
                            }
                          }}
                        >
                          <span slot="before">${heal.source}</span>
                          <span>${formatAutoHealing(heal)} </span>
                          ${timeToTick !== false
                            ? html`
                                <span slot="after">
                                  ${timeToTick === 0
                                    ? localize('ready')
                                    : ` ${localize('tick')} ${localize('in')}
                                  ${prettyMilliseconds(timeToTick)}`}
                                </span>
                                ${instances >= 2
                                  ? html`<span slot="after"
                                      >x${Math.floor(instances)}</span
                                    >`
                                  : ''}
                              `
                            : ''}
                        </wl-list-item>
                      `;
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
