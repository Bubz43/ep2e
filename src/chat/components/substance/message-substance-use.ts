import type { SubstanceUseData } from '@src/chat/message-data';
import { enumValues, SubstanceApplicationMethod } from '@src/data-enums';
import { ActorType } from '@src/entities/entity-types';
import { pickOrDefaultActor } from '@src/entities/find-entities';
import { Substance } from '@src/entities/item/proxies/substance';
import { addFeature } from '@src/features/feature-helpers';
import { currentWorldTimeMS } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { withSign } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './message-substance-use.scss';

@customElement('message-substance-use')
export class MessageSubstanceUse extends LitElement {
  static get is() {
    return 'message-substance-use' as const;
  }

  static styles = [styles];

  @property({ type: Object }) substanceUse!: SubstanceUseData;

  get substance() {
    return new Substance({
      loaded: false,
      embedded: null,
      data: this.substanceUse.substance,
    });
  }

  applySubstance() {
    pickOrDefaultActor((actor) => {
      if (actor.proxy.type === ActorType.Character) {
        actor.proxy.updater
          .prop('flags', EP.Name, 'substancesAwaitingOnset')
          .commit(
            addFeature({
              ...this.substanceUse,
              onsetStartTime: currentWorldTimeMS(),
            }),
          );
      }
    }, true);
  }

  render() {
    const { substance } = this;
    const always = substance.alwaysApplied;
    const severity = substance.hasSeverity ? substance.severity : null;
    return html`
      <mwc-button @click=${this.applySubstance} dense unelevated
        >${localize('apply')} ${localize('substance')}</mwc-button
      >
      ${this.substanceUse.useMethod !== 'use'
        ? html`
            <p>
              ${localize('applicationMethod')}:
              ${localize(this.substanceUse.useMethod)}
            </p>
          `
        : ''}
      <!-- ${always.viable
        ? html`
            <mwc-button dense unelevated class="effects"
              >${localize('applyEffects')}</mwc-button
            >
          `
        : ''}
      ${severity?.viable
        ? html`
            <div class="severity">
              <mwc-button dense unelevated class="check"
                >${localize(severity.check)} ${localize('check')}
                ${severity.checkMod
                  ? withSign(severity.checkMod)
                  : ''}</mwc-button
              >
              ${localize('SHORT', 'versus')}
              ${severity.hasEffects
                ? html`
                    <mwc-button class="effects" dense unelevated
                      >${localize('effects')}</mwc-button
                    >
                  `
                : ''}
            </div>
          `
        : ''} -->
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-substance-use': MessageSubstanceUse;
  }
}
