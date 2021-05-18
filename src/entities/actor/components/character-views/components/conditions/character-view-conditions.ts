import type { MultiSelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import {
  conditionIcons,
  ConditionType,
  getConditionEffects,
} from '@src/features/conditions';
import { formatEffect } from '@src/features/effects';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property, state } from 'lit-element';
import { compact } from 'remeda';
import styles from './character-view-conditions.scss';

@customElement('character-view-conditions')
export class CharacterViewConditions extends UseWorldTime(LitElement) {
  static get is() {
    return 'character-view-conditions' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @state() private viewEffects = false;

  private toggleViewEffects() {
    this.viewEffects = !this.viewEffects;
  }

  private setConditions(ev: MultiSelectedEvent) {
    this.character.updateConditions(
      compact(
        [...ev.detail.index].map((active) => enumValues(ConditionType)[active]),
      ),
    );
  }

  render() {
    const { disabled, conditions, temporaryConditionSources } = this.character;

    return html`
      <character-view-drawer-heading
        >${localize('conditions')}</character-view-drawer-heading
      >

      ${notEmpty(temporaryConditionSources)
        ? html`
            <section>
              <sl-header heading=${localize('temporary')}></sl-header>
              ${[...temporaryConditionSources].map(
                ([condition, list]) => html`
                  <figure>
                    <figcaption>
                      <img src=${conditionIcons[condition]} height="22px" />
                      ${localize(condition)}
                    </figcaption>
                    <ul>
                      ${list.map(
                        (timeState) => html`
                          <wl-list-item class="condition-source">
                            <span slot="before">${timeState.label}</span>
                            <span
                              >${timeState.completed
                                ? localize('expired')
                                : `${prettyMilliseconds(timeState.remaining)}
                              ${localize('remaining')}`}</span
                            >
                          </wl-list-item>
                        `,
                      )}
                    </ul>
                  </figure>
                `,
              )}
            </section>
          `
        : ''}

      <mwc-button
        @click=${this.toggleViewEffects}
        class="effects-toggle"
        icon=${this.viewEffects ? 'unfold_less' : 'unfold_more'}
        >${localize(this.viewEffects ? 'hide' : 'view')}
        ${localize('effects')}</mwc-button
      >

      <mwc-list multi @selected=${this.setConditions}>
        ${enumValues(ConditionType).map(
          (condition) => html`
            <mwc-check-list-item
              hasMeta
              graphic="icon"
              ?disabled=${disabled}
              ?selected=${conditions.includes(condition)}
            >
              <span>${localize(condition)}</span>
              <img slot="graphic" src=${conditionIcons[condition]} />
            </mwc-check-list-item>
            ${this.viewEffects
              ? html` <p class="condition-effects">
                    ${getConditionEffects(condition)
                      .map(formatEffect)
                      .join('. ')}
                  </p>
                  <li divider padded></li>`
              : ''}
          `,
        )}
      </mwc-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-conditions': CharacterViewConditions;
  }
}
