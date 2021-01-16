import type { FavorMessageData } from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import { updateFeature } from '@src/features/feature-helpers';
import { Favor, maxFavors } from '@src/features/reputations';
import { localize } from '@src/foundry/localization';
import {
  isSuccessfullTestResult,
  SuccessTestResult,
} from '@src/success-test/success-test';
import { customElement, LitElement, property, html } from 'lit-element';
import { clamp } from 'remeda';
import { MessageElement } from '../message-element';
import styles from './message-favor.scss';

@customElement('message-favor')
export class MessageFavor extends MessageElement {
  static get is() {
    return 'message-favor' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) favor!: FavorMessageData;

  private async toggleMarkAsUsed() {
    const { actor } = this.message;
    if (actor?.proxy.type === ActorType.Character) {
      const { repIdentifier, type, markedAsUsed } = this.favor;
      if (type === Favor.Trivial) return;
      const change = markedAsUsed ? -1 : 1;
      const partial = (current: number) => ({
        [type]: clamp(current + change, { max: maxFavors.get(type), min: 0 }),
      });
      if (repIdentifier.type === 'ego') {
        await actor.proxy.ego.updater
          .path('data', 'reps', repIdentifier.networkId)
          .commit((rep) => partial(rep[type]));
      } else {
        const { fakeEgoId, repId } = repIdentifier;
        actor.proxy.equippedGroups.fakeIDs
          .find((fake) => fake.id === fakeEgoId)
          ?.updater.path('data', 'reputations')
          .commit((reps) => {
            const rep = reps.find((rep) => rep.id === repId);
            return rep
              ? updateFeature(reps, { ...partial(rep[type]), id: repId })
              : reps;
          });
      }
      this.getUpdater('favor').commit({ markedAsUsed: !markedAsUsed });
    }
  }

  render() {
    const { successTestResult } = this.message;
    const noUse =
      successTestResult &&
      !isSuccessfullTestResult(successTestResult) &&
      successTestResult !== SuccessTestResult.CriticalFailure;
    return html`
      <mwc-list>
        <mwc-list-item noninteractive ?hasMeta=${this.favor.burnedRep}>
          <span>
            <span class="acronym">${this.favor.repAcronym}</span>
            <span class="type"
              >${localize(this.favor.type)} ${localize('favor')}</span
            ></span
          >
          ${this.favor.burnedRep
        ? html`<mwc-icon slot="meta">whatshot</mwc-icon>`
        : ''}
        </mwc-list-item>
        ${this.favor.burnedRep
        ? ''
        : html` <mwc-check-list-item
            ?selected=${!!this.favor.markedAsUsed}
            ?disabled=${this.disabled}
            @click=${this.toggleMarkAsUsed}
            >${localize('MarkFavorAsUsed')}</mwc-check-list-item
          >`}
        ${this.favor.keepingQuiet
        ? html`
            <mwc-list-item
              >${localize('oppose')} ${localize("with")} ${this.favor.keepingQuiet} ${localize("modifier")}</mwc-list-item
            >
          `
        : ''}
      </mwc-list>

 
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-favor': MessageFavor;
  }
}
