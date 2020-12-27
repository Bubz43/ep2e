import type {
  DamageMessageData,
  ExplosiveMessageData,
  UsedExplosiveState,
} from '@src/chat/message-data';
import {
  pickOrDefaultActor,
  pickOrDefaultCharacter,
} from '@src/entities/find-entities';
import { Explosive } from '@src/entities/item/proxies/explosive';
import { localize } from '@src/foundry/localization';
import { rollLabeledFormulas } from '@src/foundry/rolls';
import { customElement, LitElement, property, html } from 'lit-element';
import { compact, find, flatMap, pipe, uniq } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-explosive.scss';

@customElement('message-explosive')
export class MessageExplosive extends MessageElement {
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
    const { attackType = 'primary' } = this.explosiveUse;
    const {
      rollFormulas,
      damageType,
      armorPiercing,
      armorUsed,
      reduceAVbyDV,
      substance,
    } = explosive.attacks[attackType] || explosive.attacks.primary;
    const damage: DamageMessageData = {
      damageType,
      armorPiercing,
      armorUsed,
      reduceAVbyDV,
      rolledFormulas: rollLabeledFormulas(rollFormulas),
      source: explosive.name,
    };
    // TODO substance
    const { _id } = await this.message.createSimilar({ damage });
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

  render() {
    const { editable } = this.message;
    const { state, trigger, timerDuration, duration } = this.explosiveUse;

    // TODO change trigger and durations
    return html`
      <div class="info">
        <sl-group label=${localize('trigger')}>${localize(trigger)}</sl-group>
      </div>
      ${state
        ? this.renderExplosiveState(state)
        : editable
        ? html`
            <div class="actions">
              <mwc-button dense class="detonate" @click=${this.detonate}
                >${localize('detonate')}</mwc-button
              >
              <mwc-button dense class="reclaim" @click=${this.reclaim}
                >${localize('reclaim')}</mwc-button
              >
            </div>
          `
        : ''}
    `;
  }

  private renderExplosiveState([type, idOrName]: UsedExplosiveState) {
    // TODO link to generated message
    return html`
      <p class="state">
        ${localize(type)}
      </p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-explosive': MessageExplosive;
  }
}
