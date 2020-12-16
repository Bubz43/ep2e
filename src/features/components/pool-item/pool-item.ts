import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import type { ReadonlyPool } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import { clickIfEnter } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { ifDefined } from 'lit-html/directives/if-defined';
import mix from 'mix-with/lib';
import styles from './pool-item.scss';

@customElement('pool-item')
export class PoolItem extends mix(LitElement).with(LazyRipple) {
  static get is() {
    return 'pool-item' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) pool!: ReadonlyPool;

  @property({ type: Boolean }) disabled = false;

  render() {
    const { pool, disabled } = this;
    const nonUsable = disabled || pool.disabled;
    // TODO: Add some indicator that pool is disable by effect
    return html`
      <div
        class="pool ${classMap({
          disabled: nonUsable,
          [pool.type]: true,
        })}"
        slot="base"
        role="button"
        ?disabled=${nonUsable}
        @keydown=${clickIfEnter}
        @focus="${this.handleRippleFocus}"
        @blur="${this.handleRippleBlur}"
        @mousedown="${this.handleRippleMouseDown}"
        tabindex=${ifDefined(nonUsable ? undefined : '0')}
      >
        ${this.renderRipple()}
        <img src=${pool.icon} class="pool-image" />
        <div class="pool-value">
          ${pool.available} <small>${pool.max}</small>
        </div>
        <div class="pool-name">${localize(pool.type)}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pool-item': PoolItem;
  }
}
