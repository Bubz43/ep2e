import { LazyRipple } from '@src/components/mixins/lazy-ripple';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { localize } from '@src/foundry/localization';
import type { Health } from '@src/health/health-mixin';
import { localImage } from '@src/utility/images';
import { customElement, html, LitElement, property, query } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { ifDefined } from 'lit-html/directives/if-defined';
import mix from 'mix-with/lib';
import { compact } from 'remeda';
import styles from './health-item.scss';

/**
 * @slot source
 */
@customElement('health-item')
export class HealthItem<T extends Health = Health> extends mix(LitElement).with(
  LazyRipple,
  UseWorldTime,
) {
  static get is() {
    return 'health-item' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) health!: T;

  @property({ type: Boolean, reflect: true }) clickable = false;

  @property({ type: Boolean, reflect: true }) disabled = false;

  @query('.view', true) private viewElement?: HTMLElement;

  focus() {
    const { viewElement } = this;
    if (viewElement) {
      this.handleRippleFocus();
      viewElement.focus();
    }
  }

  private clickIfEnter(ev: KeyboardEvent) {
    if (this.clickable && ev.key === 'Enter') {
      (ev.currentTarget as HTMLElement).click();
    }
  }

  render() {
    const { health, clickable } = this;
    const { type, main, wound, icon, damagePercents } = health;
    const { durability, deathRating, dead } = damagePercents;
    return html`
      <div
        class="view ${dead ? 'dead' : ''}"
        tabindex=${ifDefined(clickable ? '0' : undefined)}
        role="button"
        @keydown=${this.clickIfEnter}
        @mousedown="${this.handleRippleMouseDown}"
        @mouseenter="${this.handleRippleMouseEnter}"
        @mouseleave="${this.handleRippleMouseLeave}"
        @focus="${this.handleRippleFocus}"
        @blur="${this.handleRippleBlur}"
      >
        <img
          src=${icon}
          class="health-icon"
          title="${localize(type)} ${localize('health')}"
        />

        ${health.regenState
          ? html`
              <img
                class="regen-available ${classMap({
                  ready: health.readyRegen,
                })}"
                height="16px"
                src=${localImage('icons/health/auto-repair.svg')}
              />
            `
          : ''}

        <div class="info">
          <div class="health-type" title=${health.source}>
            <slot name="source">${health.source}</slot>
          </div>
        </div>

        <section class="damage-info">
          <div
            class="damage ${classMap({
              dying: durability >= 1,
              dead,
            })}"
          >
            ${compact([main.damage, main.durability, main.deathRating]).map(
              ({ label, value }) =>
                html` <span title=${label}>${value}</span> `,
            )}
          </div>
        </section>

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

        ${wound
          ? html`
              <sl-animated-list class="wounds" fadeOnly>
                <div title=${wound.wounds.label}>
                  <img class="wound-icon" src=${health.woundIcon} /><span
                    class="wound-value"
                    >${wound.wounds.value}</span
                  >
                </div>
                ${wound.woundsIgnored.value
                  ? html`
                      <div title=${wound.woundsIgnored.label}>
                        <img
                          src=${localImage('icons/health/interdiction.svg')}
                          class="wound-icon ignored"
                        /><span class="wound-value"
                          >${wound.woundsIgnored.value}</span
                        >
                      </div>
                    `
                  : ''}
                <div
                  class="wound-threshold"
                  title=${wound.woundThreshold.label}
                >
                  <span class="threshold-label"
                    >${localize('SHORT', wound.woundThreshold.prop)}</span
                  >
                  <span class="wound-value">${wound.woundThreshold.value}</span>
                </div>
              </sl-animated-list>
            `
          : ''}
        ${this.renderRipple(this.disabled || !this.clickable)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-item': HealthItem;
  }
}
