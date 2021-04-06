import { enumValues } from '@src/data-enums';
import { PreTestPoolAction } from '@src/features/pool';
import { localize } from '@src/foundry/localization';
import type {
  PreTestPool,
  SuccessTestPools,
} from '@src/success-test/success-test';
import { customElement, html, LitElement, property } from 'lit-element';
import { equals } from 'remeda';
import styles from './success-test-pool-controls.scss';

@customElement('success-test-pool-controls')
export class SuccessTestPoolControls extends LitElement {
  static get is() {
    return 'success-test-pool-controls' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) poolState!: SuccessTestPools;

  render() {
    const { available: pools, active, toggleActive } = this.poolState;
    return html`
      <div class="pool-actions">
        <header>
          <span class="label">${localize('ignoreMods')}</span>
          <span class="label">+20 ${localize('bonus')}</span>
        </header>
        <ul>
          ${pools.map(
            (pool) => html`
              <wl-list-item>
                <div>
                  <span
                    >${localize(pool.type)}
                    <value-status
                      value=${pool.available}
                      max=${pool.max}
                    ></value-status
                  ></span>
                </div>
                ${enumValues(PreTestPoolAction).map((action) => {
                  const pair: PreTestPool = [pool, action];
                  const isActive =
                    pair[0].type === active?.[0].type &&
                    equals(pair[1], active?.[1]);
                  return html`
                    <mwc-button
                      slot=${action === PreTestPoolAction.IgnoreMods
                        ? 'before'
                        : 'after'}
                      dense
                      ?disabled=${!pool.available}
                      ?outlined=${!isActive}
                      ?unelevated=${isActive}
                      @click=${() => toggleActive(pair)}
                    >
                      <img height="20px" src=${pool.icon}
                    /></mwc-button>
                  `;
                })}
              </wl-list-item>
            `,
          )}
        </ul>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'success-test-pool-controls': SuccessTestPoolControls;
  }
}
