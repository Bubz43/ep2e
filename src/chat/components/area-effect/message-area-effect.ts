import type { MessageAreaEffectData } from '@src/chat/message-data';
import { AreaEffectType } from '@src/data-enums';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './message-area-effect.scss';

@customElement('message-area-effect')
export class MessageAreaEffect extends LitElement {
  static get is() {
    return 'message-area-effect' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) areaEffect!: MessageAreaEffectData;

  private formatAreaEffect() {
    const { areaEffect } = this;
    // TODO Shaped centered
    switch (areaEffect.type) {
      case AreaEffectType.Centered:
        return `${localize(areaEffect.type)} ${localize('areaEffect')} (${
          areaEffect.dvReduction || -2
        })`;
      case AreaEffectType.Cone:
        return `${localize(areaEffect.type)} ${localize(
          'areaEffect',
        )} (${localize('range')} ${areaEffect.range})`;

      case AreaEffectType.Uniform:
        return `${localize(areaEffect.type)} ${localize('areaEffect')} (${
          areaEffect.radius
        }m. ${localize('radius')})`;
    }
  }

  render() {
    // TODO Template
    return html` <p>${this.formatAreaEffect()}</p> `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-area-effect': MessageAreaEffect;
  }
}
