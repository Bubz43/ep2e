import type { SleightSustain, SleightSustainEnd } from '@src/chat/message-data';
import { ActorEP } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { removeFeature } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { customElement, html, property } from 'lit-element';
import { until } from 'lit-html/directives/until';
import { MessageElement } from '../message-element';
import styles from './message-sleight-sustain-end.scss';

@customElement('message-sleight-sustain-end')
export class MessageSleightSustainEnd extends MessageElement {
  static get is() {
    return 'message-sleight-sustain-end' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) sleightSustainEnd!: SleightSustainEnd;

  private async appliedToWithEntities() {
    const characters = new Map<Character, SleightSustain>();
    for (const sustain of this.sleightSustainEnd.appliedTo) {
      const { uuid } = sustain;
      const entity = await fromUuid(uuid);
      const actor =
        entity instanceof ActorEP
          ? entity
          : entity instanceof Token
          ? entity.actor
          : null;
      if (actor?.proxy.type === ActorType.Character) {
        characters.set(actor.proxy, sustain);
      }
    }
    return characters;
  }

  render() {
    return html`
      <span>${localize('applied')} ${localize('to')}</span>
      <ul>
        ${until(
          this.renderAppliedTo(),
          html`<mwc-circular-progress></mwc-circular-progress>`,
        )}
      </ul>

      ${this.sleightSustainEnd.removedFromIds.length
        ? html`
            <span>${localize('removed')} ${localize('from')}</span>

            <ul>
              ${this.sleightSustainEnd.removedFromIds.map((uuid) => {
                const entity = this.sleightSustainEnd.appliedTo.find(
                  (a) => a.uuid === uuid,
                );
                return html`<colored-tag>${entity?.name}</colored-tag>`;
              })}
            </ul>
          `
        : ''}
    `;
  }

  private async renderAppliedTo() {
    const characters = await this.appliedToWithEntities();
    return [...characters].map(
      ([character, sustain]) =>
        html`<colored-tag
          type="info"
          clickable
          ?disabled=${character.disabled ||
          this.sleightSustainEnd.removedFromIds.includes(sustain.uuid)}
          @click=${async () => {
            await character.updater
              .path('data', 'temporary')
              .commit(removeFeature(sustain.temporaryFeatureId));
            this.getUpdater('sleightSustainEnd').commit({
              removedFromIds: [
                ...this.sleightSustainEnd.removedFromIds,
                sustain.uuid,
              ],
            });
          }}
          >${sustain.name}</colored-tag
        >`,
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-sleight-sustain-end': MessageSleightSustainEnd;
  }
}
