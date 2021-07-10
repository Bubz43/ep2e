import { createMessage } from '@src/chat/create-message';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { idProp } from '@src/features/feature-helpers';
import {
  createTimestamp,
  getElapsedTime,
  prettyMilliseconds,
} from '@src/features/time';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import {
  rollLabeledFormulas,
  rollFormula,
  rollLimit,
} from '@src/foundry/rolls';
import { HealthType } from '@src/health/health';
import { hardeningTypes, MentalHealth } from '@src/health/mental-health';
import {
  formatAutoHealing,
  getMaxRecoveryInstances,
  HealOverTimeTarget,
  NaturalMentalHeal,
  Recovery,
} from '@src/health/recovery';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { clamp, range } from 'remeda';
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

  private openNaturalHealMenu() {
    const { damage, wounds } = this.health.common;
    openMenu({
      header: { heading: `${localize('attempt')} ${localize('naturalHeal')}` },
      content: enumValues(NaturalMentalHeal).map((heal) => ({
        label: localize(heal),
        disabled:
          heal === NaturalMentalHeal.Trauma
            ? !!damage || !wounds
            : heal === NaturalMentalHeal.Stress
            ? !damage
            : false,
        callback: () => {
          // TODO Rolling test
          notify(NotificationType.Info, 'INT check');
          this.health.logNaturalHeal({
            heal,
            ...createTimestamp({}),
          });
        },
      })),
    });
  }

  private async rollHeal(
    target: HealOverTimeTarget,
    heal: Recovery,
    instances: number,
  ) {
    const wholeInstances = getMaxRecoveryInstances({
      target,
      instances,
      health: this.health.data,
      amount: heal.amount,
    });

    await createMessage({
      data: {
        header: {
          heading: heal.source,
          subheadings: localize('healthRecovery'),
        },
        heal: {
          source: heal.source,
          healthType: HealthType.Mental,
          ...(target === HealOverTimeTarget.Damage
            ? {
                damageFormulas: rollLabeledFormulas(
                  Array.from({ length: wholeInstances || 1 }).map(
                    (_, index) => ({
                      label:
                        instances >= 2
                          ? `${localize('heal')} ${index + 1}`
                          : localize('heal'),
                      formula: heal.amount,
                    }),
                  ),
                ),
              }
            : {
                wounds: (rollFormula(heal.amount)?.total || 0) * wholeInstances,
              }),
        },
      },
      entity: this.character,
    });
    await this.health.logHeal(heal.slot, heal.interval * (instances % 1));
  }

  render() {
    const { timeSinceHealAttempt } = this.health;
    const { regenState, recoveries } = this.health;

    // TODO show natural heals and attempt them
    return html`
      <character-view-drawer-heading
        >${localize('mentalHealth')}</character-view-drawer-heading
      >

      <mwc-button @click=${this.openHealthEditor}
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

      <section>
        <sl-header heading=${localize('recovery')}> </sl-header>
        ${enumValues(HealOverTimeTarget).map((target) => {
          const heals = recoveries[target];
          return notEmpty(heals)
            ? html`
                <figure>
                  <figcaption>
                    ${target === HealOverTimeTarget.Damage
                      ? `${localize('stress')} ${localize('heal')}`
                      : `${localize('trauma')} ${localize('heal')}`}
                  </figcaption>
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
        <sl-header heading=${localize('naturalHeal')}>
          <mwc-icon-button
            icon="healing"
            slot="action"
            ?disabled=${this.character.disabled}
            @click=${this.openNaturalHealMenu}
          ></mwc-icon-button>
        </sl-header>
        <sl-animated-list>
          ${repeat(
            this.health.data.naturalHealAttempts,
            idProp,
            (attempt) => html`
              <wl-list-item>
                <span slot="before">${localize(attempt.heal)}</span>
                <span
                  >${prettyMilliseconds(getElapsedTime(attempt.worldTimeMS), {
                    whenZero: `0s`,
                  })}
                  ${localize('ago')}</span
                >
              </wl-list-item>
            `,
          )}
        </sl-animated-list>
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
