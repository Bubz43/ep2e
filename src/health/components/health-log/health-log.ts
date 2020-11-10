import { localize } from '@src/foundry/localization';
import { formatHealthModificationMode } from '@src/health/health';
import type { Health } from '@src/health/health-mixin';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './health-log.scss';

@customElement('health-log')
export class HealthLog extends LitElement {
  static get is() {
    return 'health-log' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) health!: Health;

  @property({ type: Boolean }) disabled = false;

  render() {
    const { log } = this.health.data;
    return html`
      <mwc-list>
        ${log.map(
          ({ mode, damage, wounds, source, realTimeMS }) => html`
            <mwc-list-item twoline noninteractive>
              <span
                ><span class="change-source">[${source}]</span>
                ${formatHealthModificationMode(mode)}</span
              >
              <span slot="secondary"
                >${damage} ${this.health.main.damage.label}, ${wounds}
                ${this.health.wound?.wounds.label} -
                <time>${timeSince(realTimeMS)}</time></span
              >
            </mwc-list-item>
          `,
        )}
      </mwc-list>
      ${notEmpty(log)
        ? html`
            <delete-button
              data-tooltip="${localize('delete')} ${localize('history')}"
              @mouseover=${tooltip.fromData}
              @focus=${tooltip.fromData}
              @delete=${() => this.health.resetLog()}
              ?disabled=${this.disabled}
            ></delete-button>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'health-log': HealthLog;
  }
}
