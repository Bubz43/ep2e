import { enumValues, PoolType } from '@src/data-enums';
import type { AppliedEffects } from '@src/entities/applied-effects';
import { poolIcon } from '@src/features/pools';
import { localize } from '@src/foundry/localization';
import type { MorphPoolsData } from '@src/foundry/template-schema';
import { tooltip } from '@src/init';
import { withSign } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { clamp } from 'remeda';
import styles from './sleeve-form-pools.scss';

export type SleeveFormPoolValues = {};

@customElement('sleeve-form-pools')
export class SleeveFormPools extends LitElement {
  static get is() {
    return 'sleeve-form-pools' as const;
  }

  static styles = [styles];

  @property({ type: Object }) poolData!: MorphPoolsData;

  @property({ attribute: false }) poolBonuses!: AppliedEffects['poolBonuses'];

  @property({ type: Boolean }) disabled = false;

  @property({ attribute: false }) editFn!: (ev: Event) => void;

  render() {
    return html`
      <sl-header heading=${localize('pools')}>
        <mwc-icon
          slot="info"
          data-ep-tooltip=${localize('DESCRIPTIONS', 'OnlyWarePoolBonus')}
          @mouseenter=${tooltip.fromData}
          >info</mwc-icon
        >
        <mwc-icon-button
          slot="action"
          icon="edit"
          data-ep-tooltip=${localize('edit')}
          @mouseover=${tooltip.fromData}
          @focus=${tooltip.fromData}
          ?disabled=${this.disabled}
          @click=${this.editFn}
        ></mwc-icon-button>
      </sl-header>
      <ul class="pools">
        ${enumValues(PoolType).map((poolType) => {
          if (poolType === PoolType.Threat) return '';
          const value = this.poolData[poolType];
          const bonus = this.poolBonuses.get(poolType)?.total;
          return html`
            <li class="pool ${classMap({ hide: !bonus && !value })}">
              ${localize(poolType)}
              <img height="19px" src=${poolIcon(poolType)} />
              ${value}
              ${bonus
                ? html`
                    <sup data-bonus=${withSign(clamp(bonus, { max: 5 }))}></sup>
                  `
                : ''}
            </li>
          `;
        })}
      </ul>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'sleeve-form-pools': SleeveFormPools;
  }
}
