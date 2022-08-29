import type { FavorMessageData } from '@src/chat/message-data';
import { ActorType } from '@src/entities/entity-types';
import { updateFeature } from '@src/features/feature-helpers';
import {
  Favor,
  maxFavors,
  repRefreshTimerActive,
} from '@src/features/reputations';
import { currentWorldTimeMS } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import {
  isSuccessfullTestResult,
  SuccessTestResult,
} from '@src/success-test/success-test';
import { customElement, LitElement, property, html } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
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
      const partial = (current: number, refreshStartTime: number) => ({
        [type]: clamp(current + change, { max: maxFavors.get(type), min: 0 }),
        refreshStartTime,
      });

      if (repIdentifier.type === 'ego') {
        await actor.proxy.ego.updater
          .path('system', 'reps', repIdentifier.networkId)
          .commit((rep) => {
            const isActive =
              repRefreshTimerActive(rep) && rep.refreshStartTime !== 0;
            const setRefresh =
              markedAsUsed || type === Favor.Major ? false : !isActive;

            return partial(
              rep[type],
              setRefresh ? currentWorldTimeMS() : rep.refreshStartTime,
            );
          });
      } else {
        const { fakeEgoId, repId } = repIdentifier;
        actor.proxy.equippedGroups.fakeIDs
          .find((fake) => fake.id === fakeEgoId)
          ?.updater.path('system', 'reputations')
          .commit((reps) => {
            const rep = reps.find((rep) => rep.id === repId);
            if (rep) {
              const isActive =
                repRefreshTimerActive(rep) && rep.refreshStartTime !== 0;
              const setRefresh =
                markedAsUsed || type === Favor.Major ? false : !isActive;
              return updateFeature(reps, {
                ...partial(
                  rep[type],
                  setRefresh ? currentWorldTimeMS() : rep.refreshStartTime,
                ),
                id: repId,
              });
            }
            return reps;
          });
      }
      this.getUpdater('favor').commit({ markedAsUsed: !markedAsUsed });
    }
  }

  render() {
    return html`
      <mwc-list>
        <mwc-list-item
          noninteractive
          graphic=${ifDefined(this.favor.fakeIdName ? 'icon' : undefined)}
          ?hasMeta=${this.favor.burnedRep}
        >
          ${this.favor.fakeIdName
            ? html`<mwc-icon slot="graphic">person_outline</mwc-icon>`
            : ''}

          <span>
            <span class="acronym">${this.favor.repAcronym}</span>
            <span class="type"
              >${localize(this.favor.type)} ${localize('favor')}</span
            ></span
          >

          ${this.favor.burnedRep
            ? html`<mwc-icon class="burn" slot="meta">whatshot</mwc-icon>`
            : ''}
        </mwc-list-item>
        ${this.favor.fakeIdName ? html`` : ''}
        ${this.favor.burnedRep || this.favor.type === Favor.Trivial
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
                >${localize('oppose')} ${localize('with')}
                ${this.favor.keepingQuiet}
                ${localize('modifier')}</mwc-list-item
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
