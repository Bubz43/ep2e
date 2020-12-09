import type { HealthChangeMessageData } from '@src/chat/message-data';
import { localize } from '@src/foundry/localization';
import { HealthModificationMode, HealthType } from '@src/health/health';
import { customElement, LitElement, property, html } from 'lit-element';
import { MessageElement } from '../message-element';
import styles from './message-health-change.scss';

@customElement('message-health-change')
export class MessageHealthChange extends MessageElement {
  static get is() {
    return 'message-health-change' as const;
  }

  static styles = [styles];

  @property({ type: Object }) healthChange!: HealthChangeMessageData;

  private get labels(): [string, string] {
    return this.healthChange.healthType === HealthType.Mental
      ? [localize('stress'), localize('traumas')]
      : [localize('damage'), localize('wounds')];
  }

  private formatChange() {
    const { mode, damage, wounds, healthType, stressType, source } = this.healthChange;
  
    const [damageLabel, woundLabel] = this.labels;
    const values = html`<span slot="secondary">${damage} ${damageLabel}, ${wounds} ${woundLabel}</span>`;
    switch (mode) {
      case HealthModificationMode.Edit:
        return html`${source} ${localize('setHealthTo')} ${values} `;

      case HealthModificationMode.Heal:
        return html`${source} ${localize('healed')} ${values}`;

      case HealthModificationMode.Inflict:
        return html`${source} ${localize('inflicted')} ${values} 
        <!-- ${
          healthType === HealthType.Mental && stressType
            ? html`<div>${localize("from")} ${localize(stressType)}</div>`
            : ''
          } -->
        `;
    }
  }

  render() {
    return html`
      <mwc-list>
      <mwc-list-item noninteractive twoline>${this.formatChange()}</mwc-list-item>

      </mwc-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-health-change': MessageHealthChange;
  }
}
