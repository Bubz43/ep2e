import type {
  AttackTraitData,
  DamageMessageData,
  ExplosiveMessageData,
  MessageAreaEffectData,
  SubstanceUseData,
  UsedExplosiveState,
} from '@src/chat/message-data';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import {
  AreaEffectType,
  Demolition,
  ExplosiveTrigger,
  SubstanceType,
} from '@src/data-enums';
import { ExplosiveSettingsForm } from '@src/entities/actor/components/character-views/components/attacks/explosive-settings/explosive-settings-form';
import type {
  ProximityTrigger,
  TimerTrigger,
} from '@src/entities/explosive-settings';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { Explosive } from '@src/entities/item/proxies/explosive';
import {
  CommonInterval,
  createLiveTimeState,
  currentWorldTimeMS,
} from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, property } from 'lit-element';
import mix from 'mix-with/lib';
import { compact, createPipe, flatMap, pipe, prop } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-explosive.scss';

// TODO only use world time when time state

@customElement('message-explosive')
export class MessageExplosive extends mix(MessageElement).with(UseWorldTime) {
  static get is() {
    return 'message-explosive' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) explosiveUse!: ExplosiveMessageData;

  get explosive() {
    return new Explosive({
      data: this.explosiveUse.explosive,
      loaded: false,
      embedded: null,
    });
  }

  private async detonate() {
    const { explosive } = this;
    const {
      attackType = 'primary',
      centeredReduction,
      uniformBlastRadius,
      templateIDs,
      demolition,
    } = this.explosiveUse;
    const {
      rollFormulas,
      damageType,
      armorPiercing,
      armorUsed,
      reduceAVbyDV,
      substance,
      attackTraits,
      duration,
      notes,
    } = explosive.attacks[attackType] || explosive.attacks.primary;

    // TODO apply demolition effects

    const damage: DamageMessageData | undefined = notEmpty(rollFormulas)
      ? {
          damageType,
          armorPiercing,
          armorUsed,
          reduceAVbyDV,
          rolledFormulas: rollLabeledFormulas(rollFormulas),
          source: explosive.name,
        }
      : undefined;

    const attackTraitInfo: AttackTraitData | undefined = notEmpty(attackTraits)
      ? {
          traits: attackTraits,
          duration,
          notes,
          startTime: duration ? currentWorldTimeMS() : undefined,
        }
      : undefined;

    const substanceUse: SubstanceUseData | undefined = substance
      ? {
          substance: substance.getDataCopy(),
          useMethod:
            substance.substanceType === SubstanceType.Chemical
              ? 'use'
              : explosive.epData.useSubstance ||
                substance.applicationMethods[0]!,
          doses: explosive.epData.dosesPerUnit,
          showHeader: true,
        }
      : undefined;

    const areaEffect: MessageAreaEffectData | undefined =
      explosive.areaEffect === AreaEffectType.Centered
        ? {
            type: explosive.areaEffect,
            dvReduction: centeredReduction || -2,
            templateIDs,
            angle:
              demolition?.type === Demolition.ShapeCentered
                ? demolition.angle
                : undefined,
          }
        : explosive.areaEffect === AreaEffectType.Uniform
        ? {
            type: explosive.areaEffect,
            radius: uniformBlastRadius || explosive.areaEffectRadius || 1,
            templateIDs,
          }
        : undefined;

    const { _id } = await this.message.createSimilar({
      areaEffect,
      damage,
      attackTraitInfo,
      substanceUse,
    });

    this.getUpdater('explosiveUse').commit({ state: ['detonated', _id] });
  }

  private async reclaim() {
    pickOrDefaultCharacter(async (character) => {
      const { explosive } = this;
      const [sameExplosive] = pipe(
        [character.items.get(explosive.id), ...character.items.values()],
        compact,
        flatMap((i) =>
          i.type === explosive.type && i.isSameAs(explosive) ? i : [],
        ),
      );
      if (sameExplosive) await sameExplosive.setQuantity((val) => val + 1);
      else {
        const copy = explosive.getDataCopy();
        copy.data.quantity = 1;
        await character.itemOperations.add(copy);
      }

      this.getUpdater('explosiveUse').commit({
        state: ['reclaimed', character.actor.tokenOrLocalInfo.name],
      });
    });
  }

  private editSettings() {
    ExplosiveSettingsForm.openWindow({
      explosive: this.explosive,
      initialSettings: this.explosiveUse,
      requireSubmit: true,
      adjacentEl: this,
      update: createPipe(
        prop('detail'),
        this.getUpdater('explosiveUse').commit,
      ),
    });
  }

  private attemptDefusal() {
    // TODO check
  }

  private proximityActivationTimer(trigger: ProximityTrigger) {
    return createLiveTimeState({
      label: localize('activation'),
      updateStartTime: (newStartTime) =>
        this.getUpdater('explosiveUse').commit({
          trigger: { ...trigger, startTime: newStartTime },
        }),
      startTime: trigger.startTime || currentWorldTimeMS(),
      id: this.message.id,
      duration: CommonInterval.Turn * 3,
    });
  }

  render() {
    const { state, trigger, demolition } = this.explosiveUse;
    const { explosive, disabled } = this;
    // TODO detonation options
    return html`
      ${!disabled
        ? html`
            <div class="settings">
              ${explosive.hasSecondaryMode
                ? html`<div class="attack-mode">
                    ${explosive.attacks[
                      this.explosiveUse.attackType || 'primary'
                    ]?.label}
                  </div>`
                : ''}
          
              <div class="trigger-option">
                ${localize(trigger.type)} ${localize('trigger')}
              </div>
              ${state
                ? ''
                : html`
                    <div class="controls">
                      <mwc-icon-button
                        icon="undo"
                        @click=${this.reclaim}
                      ></mwc-icon-button>
                      <mwc-icon-button
                        icon="settings"
                        @click=${this.editSettings}
                      ></mwc-icon-button>
                    </div>
                  `}
            </div>
            ${demolition
                ? html`
                    <sl-group class="demo-option" label=   ${localize("demolitions")} >
                    ${localize(demolition.type)}
                    </sl-group>
                  `
                : ''}
          `
        : ''}
      ${state
        ? this.renderExplosiveState(state)
        : html`
            <div class="detonation-info">
              ${trigger.type === ExplosiveTrigger.Proximity
                ? this.renderProximityTriggerInfo(trigger)
                : trigger.type === ExplosiveTrigger.Timer
                ? this.renderTimerTriggerInfo(trigger)
                : trigger.type === ExplosiveTrigger.Airburst
                ? html`<p class="trigger-info">
                    ${`${localize('explodeAfter')} ${
                      trigger.distance
                    } ${localize('meters')}`.toLocaleLowerCase()}
                  </p>`
                : ''}
            </div>

            ${!disabled
              ? html` <mwc-button
                  outlined
                  dense
                  class="detonate"
                  @click=${this.detonate}
                  >${localize('detonate')}</mwc-button
                >`
              : ''}
          `}

      <!-- <div class="actions">
        <mwc-button dense class="defuse" @click=${this.attemptDefusal}
          >${localize('defuse')}</mwc-button
        >
      </div> -->
    `;
  }

  private renderTimerTriggerInfo(trigger: TimerTrigger) {
    return html`
      <time-state-item
        readyLabel=${localize('in')}
        .timeState=${createLiveTimeState({
          label: `${localize('detonation')}`,
          updateStartTime: (newStartTime) =>
            this.getUpdater('explosiveUse').commit({
              trigger: { ...trigger, startTime: newStartTime },
            }),
          startTime: trigger.startTime,
          id: this.message.id,
          duration: trigger.detonationPeriod,
        })}
        completion="ready"
        ?disabled=${this.disabled}
      ></time-state-item>
    `;
  }

  private renderProximityTriggerInfo(trigger: ProximityTrigger) {
    const timer =
      typeof trigger.startTime === 'number'
        ? this.proximityActivationTimer(trigger)
        : null;
    return html`
      <p class="trigger-info">
        ${`${trigger.radius} m. ${localize('triggerRadius')} ${localize('on')}
        ${localize(trigger.targets || 'any')} ${localize(
          'movement',
        )}`.toLocaleLowerCase()}
      </p>
      ${timer
        ? html`
            <time-state-item
              readyLabel=${localize('in')}
              .timeState=${timer}
              completion="ready"
              ?disabled=${this.disabled}
            ></time-state-item>
          `
        : html`
            <mwc-button
              dense
              @click=${() =>
                this.getUpdater('explosiveUse').commit({
                  trigger: { ...trigger, startTime: currentWorldTimeMS() },
                })}
              >${localize('trigger')}</mwc-button
            >
          `}
    `;
  }

  private renderExplosiveState([type, idOrName]: UsedExplosiveState) {
    // TODO link to generated message
    return html` <p class="state">${localize(type)}</p> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-explosive': MessageExplosive;
  }
}
