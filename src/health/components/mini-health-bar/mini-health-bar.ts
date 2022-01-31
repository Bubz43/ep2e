import { localize } from '@src/foundry/localization';
import type { Health } from '@src/health/health-mixin';
import { customElement, html, LitElement, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import styles from './mini-health-bar.scss';

/**
 * @slot source
 */
@customElement('mini-health-bar')
export class MiniHealth<T extends Health = Health> extends LitElement {
  static get is() {
    return 'mini-health-bar' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) health!: T;

  render() {
    const { health } = this;
    const { type, main, wound, icon, damagePercents } = health;
    const { durability, deathRating, dead } = damagePercents;
    return html`
      <img
        src=${icon}
        class="health-icon"
        title="${localize(type)} ${localize('health')}"
      />

      <div class="bars ${classMap({ dead })}">
        <div
          class="bar"
          style="--percent: ${durability}; flex: ${(main.durability.value /
            (main.deathRating?.value || 0)) *
          2}"
        ></div>

        ${(main.deathRating?.value || 0) > main.durability.value
          ? html` <div class="bar" style="--percent: ${deathRating};"></div> `
          : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'mini-health-bar': MiniHealth;
  }
}
