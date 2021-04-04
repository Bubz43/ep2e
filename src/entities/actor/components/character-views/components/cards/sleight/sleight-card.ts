import type { Sleight } from '@src/entities/item/proxies/sleight';
import { customElement, property, TemplateResult } from 'lit-element';
import { ItemCardBase } from '../item-card-base';
import styles from './sleight-card.scss';

@customElement('sleight-card')
export class SleightCard extends ItemCardBase {
  static get is() {
    return 'sleight-card' as const;
  }

  static get styles() {
    return [...super.styles, styles];
  }

  @property({ attribute: false }) item!: Sleight;

  renderHeaderButtons(): TemplateResult {
    throw new Error('Method not implemented.');
  }
  renderExpandedContent(): TemplateResult {
    throw new Error('Method not implemented.');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sleight-card': SleightCard;
  }
}
