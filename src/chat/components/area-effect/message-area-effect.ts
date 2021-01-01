import type { MessageAreaEffectData } from '@src/chat/message-data';
import { getCenteredDistance } from '@src/combat/area-effect';
import { AreaEffectType, Demolition } from '@src/data-enums';
import type { MeasuredTemplateData } from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { nonNegative } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { clamp } from 'remeda';
import type { SetOptional } from 'type-fest';
import { MessageElement } from '../message-element';
import styles from './message-area-effect.scss';

@customElement('message-area-effect')
export class MessageAreaEffect extends MessageElement {
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

  private get damage() {
    return this.message.epFlags?.damage?.rolledFormulas.reduce((accum, { roll}) => accum + roll.total, 0) || 0
  }

  private get templateData(): SetOptional<
  Pick<MeasuredTemplateData, 't' | 'distance' | 'angle'>,
  'angle'
> {
    const { areaEffect } = this;
    switch (areaEffect.type) {
      case AreaEffectType.Uniform:
        return {
          t: "circle",
          distance: areaEffect.radius
        }
      case AreaEffectType.Cone:
        return {
          t: "cone",
          angle: 8,
          distance: areaEffect.range
        }
      
      case AreaEffectType.Centered:
        return {
          t: areaEffect.angle ? "cone" : "circle",
          distance: getCenteredDistance(this.damage, areaEffect.dvReduction || -2),
          angle: areaEffect.angle
        }
    }
}

  render() {
    // TODO Template
    const { areaEffect, nonInteractive } = this;
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
        
        ${nonInteractive ? "" : html`
        
        `}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'message-area-effect': MessageAreaEffect;
  }
}
