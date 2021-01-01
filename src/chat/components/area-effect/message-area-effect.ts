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

  private formatFalloff() {
    const { areaEffect } = this;
    // TODO Shaped centered
    switch (areaEffect.type) {
      case AreaEffectType.Centered:
        return `${areaEffect.dvReduction || -2} ${localize("SHORT", "damageValue")}/m`;
      case AreaEffectType.Cone:
        return `${localize('range')} ${areaEffect.range}`;

      case AreaEffectType.Uniform:
        return `${areaEffect.radius}m. ${localize('radius')}`;
    }
  }

  render() {
    // TODO Template
    const { areaEffect } = this;
    return html`
      <p>
        ${localize(areaEffect.type)} ${localize('areaEffect')}
        <span class="falloff">${this.formatFalloff()}</span>
      </p>

      ${areaEffect.type === AreaEffectType.Centered && areaEffect.angle
        ? html`
            <p class="shaped">
              ${localize('shaped')} ${localize('to')} ${areaEffect.angle}°
              ${localize('angle').toLocaleLowerCase()}
            </p>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-area-effect': MessageAreaEffect;
  }
}
