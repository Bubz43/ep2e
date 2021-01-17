import { localize } from '@src/foundry/localization';
import { RollMultiplier, rollMultipliers } from '@src/health/health-changes';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './multiplier-select.scss';

@customElement('multiplier-select')
export class MultiplierSelect extends LitElement {
  static get is() {
    return 'multiplier-select' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ type: Number }) multiplier!: RollMultiplier;

  private emitUpdate(multiplier: RollMultiplier) {
    this.dispatchEvent(
      new CustomEvent('roll-multiplier', {
        detail: multiplier,
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <span>${localize('multiplier')}</span>
      ${rollMultipliers.map(
        (multiplier) =>
          html`<button
            @click=${() => this.emitUpdate(multiplier)}
            class="${multiplier === this.multiplier ? 'active' : ''}"
          >
            ${multiplier}
          </button>`,
      )}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'multiplier-select': MultiplierSelect;
  }
}
