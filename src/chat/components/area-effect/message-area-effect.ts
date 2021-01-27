import type { MessageAreaEffectData } from '@src/chat/message-data';
import { getCenteredDistance } from '@src/combat/area-effect';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { AreaEffectType } from '@src/data-enums';
import {
  createLiveTimeState,
  getElapsedTime,
  prettyMilliseconds,
} from '@src/features/time';
import {
  createTemporaryMeasuredTemplate,
  deletePlacedTemplate,
  editPlacedTemplate,
  MeasuredTemplateData,
  placeMeasuredTemplate,
  readyCanvas,
} from '@src/foundry/canvas';
import { localize } from '@src/foundry/localization';
import { customElement, html, property } from 'lit-element';
import mix from 'mix-with/lib';
import { noop } from 'remeda';
import type { SetOptional } from 'type-fest';
import { MessageElement } from '../message-element';
import styles from './message-area-effect.scss';

@customElement('message-area-effect')
export class MessageAreaEffect extends mix(MessageElement).with(UseWorldTime) {
  static get is() {
    return 'message-area-effect' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Object }) areaEffect!: MessageAreaEffectData;

  // @internalProperty() private targets = new Set<Token>();

  // update(changedProps: PropertyValues) {
  //   if (this.areaEffect.templateIDs) {
  //     if (!readyCanvas()) {
  //       Hooks.once('canvasReady', () => this.setTargets());
  //     } else this.setTargets();
  //   } else this.targets.clear();
  //   super.update(changedProps);
  // }

  // private setTargets() {
  //   if (this.areaEffect.templateIDs) {
  //     this.targets = getVisibleTokensWithinHighlightedTemplate(
  //       this.areaEffect.templateIDs.templateId,
  //     );
  //   }
  // }

  private formatFalloff() {
    const { areaEffect } = this;
    // TODO Shaped centered
    switch (areaEffect.type) {
      case AreaEffectType.Centered:
        return `${areaEffect.dvReduction || -2} ${localize(
          'SHORT',
          'damageValue',
        )}/m`;
      case AreaEffectType.Cone:
        return `${localize('range')} ${areaEffect.range}`;

      case AreaEffectType.Uniform:
        return `${areaEffect.radius}m. ${localize(
          'radius',
        ).toLocaleLowerCase()}`;
    }
  }

  private get damage() {
    return (
      this.message.epFlags?.damage?.rolledFormulas.reduce(
        (accum, { roll }) => accum + roll.total,
        0,
      ) || 0
    );
  }

  private get templateData(): SetOptional<
    Pick<MeasuredTemplateData, 't' | 'distance' | 'angle'>,
    'angle'
  > {
    const { areaEffect } = this;
    switch (areaEffect.type) {
      case AreaEffectType.Uniform:
        return {
          t: 'circle',
          distance: areaEffect.radius,
        };
      case AreaEffectType.Cone:
        return {
          t: 'cone',
          angle: 8,
          distance: areaEffect.range,
        };

      case AreaEffectType.Centered:
        return {
          t: areaEffect.angle ? 'cone' : 'circle',
          distance: getCenteredDistance(
            this.damage,
            areaEffect.dvReduction || -2,
          ),
          angle: areaEffect.angle,
        };
    }
  }

  private async setTemplate(ev: MouseEvent) {
    const center = readyCanvas()?.scene._viewPosition ?? { x: 0, y: 0 };

    const templateIDs = await placeMeasuredTemplate(
      createTemporaryMeasuredTemplate({
        ...center,
        ...this.templateData,
      }),
    );
    if (templateIDs) this.getUpdater('areaEffect').commit({ templateIDs });
  }

  private editTemplate() {
    editPlacedTemplate(this.areaEffect.templateIDs);
  }

  private async removeTemplate() {
    await deletePlacedTemplate(this.areaEffect.templateIDs);
    this.getUpdater('areaEffect').commit({ templateIDs: null });
  }

  render() {
    // TODO Template
    const { areaEffect, nonInteractive } = this;
    const { duration, startTime } = areaEffect;
    const timeState =
      duration && startTime != null
        ? createLiveTimeState({
            id: '',
            duration,
            startTime,
            updateStartTime: noop,
            label: localize('lasts'),
          })
        : null;
    return html`
      ${nonInteractive
        ? ''
        : html`
            <div class="template">
              ${areaEffect.templateIDs
                ? html`
                    ${readyCanvas()?.scene.id === areaEffect.templateIDs.sceneId
                      ? html`
                          <mwc-icon-button
                            icon="edit"
                            @click=${this.editTemplate}
                          ></mwc-icon-button>
                        `
                      : ''}
                    <mwc-icon-button
                      icon="clear"
                      @click=${this.removeTemplate}
                    ></mwc-icon-button>
                  `
                : html`
                    <mwc-icon-button
                      icon="place"
                      @click=${this.setTemplate}
                    ></mwc-icon-button>
                  `}
            </div>
          `}
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
      ${timeState
        ? html`
            <span class="remaining-time">
              ${prettyMilliseconds(timeState.remaining)}
              ${localize('remaining')}</span
            >
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
