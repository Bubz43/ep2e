import { renderNumberField } from '@src/components/field/fields';
import { renderUpdaterForm } from '@src/components/form/forms';
import type { UpdateActions } from '@src/entities/update-store';
import {
  EgoRepData,
  Favor,
  maxFavors,
  RepNetwork,
  repRefreshTimerActive,
} from '@src/features/reputations';
import { currentWorldTimeMS } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { customElement, html, LitElement, property } from 'lit-element';
import { range } from 'remeda';
import styles from './ego-form-rep.scss';

@customElement('ego-form-rep')
export class EgoFormRep extends LitElement {
  static get is() {
    return 'ego-form-rep' as const;
  }

  static styles = [styles];

  @property({
    attribute: false,
    hasChanged() {
      return true;
    },
  })
  repOps!: UpdateActions<EgoRepData>;

  @property({ type: String }) network!: RepNetwork;

  @property({ type: Boolean }) disabled = false;

  render() {
    const repData = this.repOps.originalValue();
    return html`
      ${renderUpdaterForm(this.repOps, {
        disabled: this.disabled,
        classes: 'rep-form',
        fields: ({ track, score }) => html`
          <mwc-icon-button-toggle
            class="track-toggle"
            ?on=${track.value}
            onIcon="favorite"
            offIcon="favorite_border"
            @click=${() => this.repOps.commit({ track: !track.value })}
            ?disabled=${this.disabled}
          ></mwc-icon-button-toggle>
          <span class="rep-name"
            >${localize('FULL', this.network)}
            <span class="network-abbreviation"
              >(${localize(this.network)})</span
            ></span
          >
          <div class="favors">
            ${[...maxFavors].map(([favor, max]) => {
              const usedAmount = repData[favor];
              return html`
                <span title=${localize(favor)}>
                  <span class="favor-label">${localize('SHORT', favor)}</span>
                  ${range(1, max + 1).map((favorNumber) => {
                    const used = usedAmount >= favorNumber;
                    return html`
                      <mwc-icon-button
                        @click=${() => {
                          const isActive =
                            repRefreshTimerActive(repData) &&
                            repData.refreshStartTime !== 0;
                          const setRefresh =
                            favor === Favor.Major ? false : !isActive;
                          return this.repOps.commit({
                            [favor]: used
                              ? favorNumber === 1
                                ? 0
                                : favorNumber === 2
                                ? 1
                                : 2
                              : favorNumber,
                            refreshStartTime: setRefresh
                              ? currentWorldTimeMS()
                              : undefined,
                          });
                        }}
                        ?disabled=${this.disabled}
                        icon=${used ? 'check_box' : 'check_box_outline_blank'}
                      ></mwc-icon-button>
                    `;
                  })}
                </span>
              `;
            })}
          </div>
          ${renderNumberField(score, { min: -99, max: 99 })}
        `,
      })}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'ego-form-rep': EgoFormRep;
  }
}
