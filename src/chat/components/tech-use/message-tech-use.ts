import type { TechUse } from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import { pickOrDefaultCharacter } from '@src/entities/find-entities';
import { addFeature } from '@src/features/feature-helpers';
import { createTemporaryFeature } from '@src/features/temporary';
import { localize } from '@src/foundry/localization';
import { AptitudeCheckControls } from '@src/success-test/components/aptitude-check-controls/aptitude-check-controls';
import { customElement, html, LitElement, property } from 'lit-element';
import styles from './message-tech-use.scss';

@customElement('message-tech-use')
export class MessageTechUse extends LitElement {
  static get is() {
    return 'message-tech-use' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) techUse!: TechUse;

  private startDefense() {
    const { resistCheck } = this.techUse;
    if (!resistCheck) return;
    pickOrDefaultCharacter((character) => {
      AptitudeCheckControls.openWindow({
        entities: { actor: character.actor },

        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;
          return {
            ego: actor.proxy.ego,
            character: actor.proxy,
            aptitude: resistCheck,
          };
        },
      });
    });
  }

  private applyEffects() {
    const { effects, duration, tech } = this.techUse;
    pickOrDefaultCharacter((character) => {
      character.updater.path('data', 'temporary').commit(
        addFeature(
          createTemporaryFeature.effects({
            duration,
            effects,
            name: tech.name,
          }),
        ),
      );
    });
  }

  render() {
    const { resistCheck } = this.techUse;
    return html`
      ${resistCheck
        ? html`
            <sl-group label="${localize('resist')} ${localize('with')}"
              ><mwc-button dense class="resist" @click=${this.startDefense}
                >${localize(resistCheck)}</mwc-button
              ></sl-group
            >
          `
        : ''}
      <mwc-button @click=${this.applyEffects}
        >${localize('applyEffects')}</mwc-button
      >
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-tech-use': MessageTechUse;
  }
}
