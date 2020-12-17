import type { SubstanceUseData } from '@src/chat/message-data';
import { enumValues, SubstanceApplicationMethod } from '@src/data-enums';
import { Substance } from '@src/entities/item/proxies/substance';
import { localize } from '@src/foundry/localization';
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

  get showMethod() {
    const { useMethod } = this.substanceUse;
    return useMethod !== 'app' && useMethod !== 'use';
  }

  get substance() {
    return new Substance({
      loaded: false,
      embedded: null,
      data: this.substanceUse.substance,
    })
  }

  render() {
    const { substance, showMethod } = this;
    const always = substance.alwaysApplied;
    const severity = substance.hasSeverity ? substance.severity : null;
    return html`
      ${showMethod
        ? html`
            <h4>
              ${localize('applicationMethod')}:
              ${localize(this.substanceUse.useMethod)}
            </h4>
          `
        : ''}
      ${always.viable
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
              ${severity.hasInstantDamage
                ? html`
                    <mwc-button dense unelevated class="damage-roll"
                      >${localize('damage')}</mwc-button
                    >
                  `
                : ''}
              ${severity.hasEffects
                ? html`
                    <mwc-button class="effects" dense unelevated
                      >${localize('effects')}</mwc-button
                    >
                  `
                : ''}
            </div>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-substance-use': MessageSubstanceUse;
  }
}
