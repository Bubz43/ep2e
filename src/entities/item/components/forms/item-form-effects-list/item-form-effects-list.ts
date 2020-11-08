import { Effect, formatEffect } from '@src/features/effects';
import {
  AddUpdateRemoveFeature,
  idProp,
  StringID,
} from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { customElement, LitElement, property, html } from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { sortBy } from 'remeda';
import styles from './item-form-effects-list.scss';

@customElement('item-form-effects-list')
export class ItemFormEffectsList extends LitElement {
  static get is() {
    return 'item-form-effects-list' as const;
  }

  static styles = [styles];

  @property({ type: String }) label = '';

  @property({ type: Array }) effects!: StringID<Effect>[];

  @property({ attribute: false }) operations!: AddUpdateRemoveFeature<
    StringID<Effect>
  >;

  @property({ type: Boolean }) disabled = false;

  render() {
    const { effects } = this;
    const commaTarget = effects.length - 1;
    return html`
      <sl-animated-list class="effects-list">
        ${this.label ? html` <li class="label">${this.label}:</li> ` : ''}
        ${repeat(
          sortBy(effects, (effect) => localize(effect.type)),
          idProp,
          (effect, index) => html`
            <li ?data-comma=${index < commaTarget}>
              <button>${formatEffect(effect)}</button>
            </li>
          `,
        )}
      </sl-animated-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-form-effects-list': ItemFormEffectsList;
  }
}