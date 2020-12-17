import type { SubstanceUseData } from '@src/chat/message-data';
import { Substance } from '@src/entities/item/proxies/substance';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './message-substance-use.scss';

@customElement('message-substance-use')
export class MessageSubstanceUse extends LitElement {
  static get is() {
    return 'message-substance-use' as const;
  }

  static styles = [styles];

  @property({ type: Object }) substanceUse!: SubstanceUseData;

  render() {
    const substance = new Substance({
      loaded: false,
      embedded: null,
      data: this.substanceUse.substance,
    });
    return html`
      <span>${localize(this.substanceUse.useMethod)}</span>
      <mwc-button unelevated dense
        >${localize('apply')} ${localize('effects')}</mwc-button
      >
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-substance-use': MessageSubstanceUse;
  }
}
