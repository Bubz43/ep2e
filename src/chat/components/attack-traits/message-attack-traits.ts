import type { AttackTraitData } from '@src/chat/message-data';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { AptitudeType, AttackTrait } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { SpecialTest } from '@src/features/tags';
import { createLiveTimeState, prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { AptitudeCheckControls } from '@src/success-test/components/aptitude-check-controls/aptitude-check-controls';
import { customElement, property, html } from 'lit-element';
import mix from 'mix-with/lib';
import { MessageElement } from '../message-element';
import styles from './message-attack-traits.scss';

// TODO only use world time when time state

@customElement('message-attack-traits')
export class MessageAttackTraits extends mix(MessageElement).with(
  UseWorldTime,
) {
  static get is() {
    return 'message-attack-traits' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) attackTraitInfo!: AttackTraitData;

  private applyTrait(trait: AttackTrait) {
    pickOrDefaultCharacter((character) => {
      switch (trait) {
        case AttackTrait.Shock:
          AptitudeCheckControls.openWindow({
            entities: { actor: character.actor },
            getState: (actor) => {
              if (actor.proxy.type !== ActorType.Character) return null;
              return {
                ego: actor.proxy.ego,
                character: actor.proxy,
                aptitude: AptitudeType.Somatics,
                special: {
                  type: SpecialTest.Shock,
                  source: this.attackTraitInfo.source,
                  messageRef: this.message.id,
                },
              };
            },
          });
          break;

        case AttackTrait.Blinding:
          AptitudeCheckControls.openWindow({
            entities: { actor: character.actor },
            getState: (actor) => {
              if (actor.proxy.type !== ActorType.Character) return null;
              return {
                ego: actor.proxy.ego,
                character: actor.proxy,
                aptitude: AptitudeType.Reflexes,
                special: {
                  type: SpecialTest.Blinding,
                  source: this.attackTraitInfo.source,
                  messageRef: this.message.id,
                },
              };
            },
          });
          break;

        case AttackTrait.Entangling:
          AptitudeCheckControls.openWindow({
            entities: { actor: character.actor },
            getState: (actor) => {
              if (actor.proxy.type !== ActorType.Character) return null;
              return {
                ego: actor.proxy.ego,
                character: actor.proxy,
                aptitude: AptitudeType.Reflexes,
                special: {
                  type: SpecialTest.Entangling,
                  source: this.attackTraitInfo.source,
                  messageRef: this.message.id,
                  originalResult: this.attackTraitInfo.testResult,
                },
              };
            },
          });
          break;

        case AttackTrait.Knockdown:
          AptitudeCheckControls.openWindow({
            entities: { actor: character.actor },
            getState: (actor) => {
              if (actor.proxy.type !== ActorType.Character) return null;
              return {
                ego: actor.proxy.ego,
                character: actor.proxy,
                aptitude: AptitudeType.Somatics,
                special: {
                  type: SpecialTest.Knockdown,
                  source: this.attackTraitInfo.source,
                  messageRef: this.message.id,
                },
              };
            },
          });
          break;

        case AttackTrait.Pain:
          AptitudeCheckControls.openWindow({
            entities: { actor: character.actor },
            getState: (actor) => {
              if (actor.proxy.type !== ActorType.Character) return null;
              return {
                ego: actor.proxy.ego,
                character: actor.proxy,
                aptitude: AptitudeType.Willpower,
                special: {
                  type: SpecialTest.PainResistance,
                  source: this.attackTraitInfo.source,
                  messageRef: this.message.id,
                },
              };
            },
          });
          break;

        case AttackTrait.Stun:
          AptitudeCheckControls.openWindow({
            entities: { actor: character.actor },
            getState: (actor) => {
              if (actor.proxy.type !== ActorType.Character) return null;
              return {
                ego: actor.proxy.ego,
                character: actor.proxy,
                aptitude: AptitudeType.Somatics,
                special: {
                  type: SpecialTest.Stun,
                  source: this.attackTraitInfo.source,
                  messageRef: this.message.id,
                },
              };
            },
          });
          break;
      }
    });
  }

  private get timeState() {
    const { duration, startTime } = this.attackTraitInfo;
    if (duration && startTime !== undefined) {
      return createLiveTimeState({
        duration,
        startTime,
        label: `${localize('apply')}`,
        id: '',
        updateStartTime: (newTime) =>
          this.getUpdater('attackTraitInfo').commit({ startTime: newTime }),
      });
    }
    return null;
  }

  render() {
    const { traits, notes } = this.attackTraitInfo;
    const { timeState } = this;
    return html`
      <div class="traits">
        ${traits.map(
          (trait) => html`
            <mwc-button
              dense
              outlined
              label=${localize(trait)}
              @click=${() => this.applyTrait(trait)}
            ></mwc-button>
          `,
        )}
      </div>
      ${timeState
        ? html`
            <div class="time-state">
              ${localize('applyableFor')}
              ${prettyMilliseconds(timeState.remaining)}
            </div>
          `
        : ''}
      ${notes ? html` <p class="notes">${notes}</p> ` : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-attack-traits': MessageAttackTraits;
  }
}
