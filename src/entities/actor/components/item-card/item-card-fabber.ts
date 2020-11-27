import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './item-card-fabber.scss';

@customElement('item-card-fabber')
export class ItemCardFabber extends UseWorldTime(LitElement) {
  static get is() {
    return 'item-card-fabber' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) fabber!: PhysicalTech;

  render() {
    const { fabricatedItem, printProgress } = this.fabber;

    return html`
      ${fabricatedItem?.nonDefaultImg
        ? html` <img height="20px" src=${fabricatedItem.nonDefaultImg} /> `
        : ''}
      <span
        >${fabricatedItem
          ? html`${fabricatedItem.name}
              <span class="nested-type">${fabricatedItem.fullType}</span>`
          : `--${localize('available')}--`}</span
      >
      ${fabricatedItem
        ? html`
            <mwc-linear-progress
              progress=${printProgress.elapsed / printProgress.duration}
            ></mwc-linear-progress>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-card-fabber': ItemCardFabber;
  }
}
