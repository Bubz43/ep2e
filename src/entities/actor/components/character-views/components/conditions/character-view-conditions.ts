import type { MultiSelectedEvent } from '@material/mwc-list/mwc-list-foundation';
import { enumValues } from '@src/data-enums';
import type { Character } from '@src/entities/actor/proxies/character';
import { ConditionType, getConditionEffects } from '@src/features/conditions';
import { formatEffect } from '@src/features/effects';
import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html, internalProperty } from 'lit-element';
import { compact } from 'remeda';
import styles from './character-view-conditions.scss';

@customElement('character-view-conditions')
export class CharacterViewConditions extends LitElement {
  static get is() {
    return 'character-view-conditions' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @internalProperty() private viewEffects = false;

  private toggleViewEffects() {
    this.viewEffects = !this.viewEffects
  }

  private get conditions() {
    return this.character.sleeve?.conditions ?? [];
  }

  private setConditions(ev: MultiSelectedEvent) {
    this.character.updateConditions(
      compact(
        [...ev.detail.index].map((active) => enumValues(ConditionType)[active]),
      ),
    );
  }

  render() {
    const { conditions } = this;
    return html`
      <character-view-drawer-heading
        >${localize('conditions')}</character-view-drawer-heading
      >

    <mwc-icon-button class="effects-toggle" @click=${this.toggleViewEffects} icon=${this.viewEffects ? "unfold_less" : "unfold_more"}></mwc-icon-button>


      <mwc-list multi @selected=${this.setConditions}>
        ${enumValues(ConditionType).map(
          (condition) => html`
            <mwc-check-list-item
              left
              ?selected=${conditions.includes(condition)}
            >
              <span>${localize(condition)}</span>
             
            </mwc-check-list-item>
           ${this.viewEffects ? html` <p class="condition-effects">${getConditionEffects(condition)
                .map(formatEffect)
            .join('. ')}</p>
                <li divider padded></li>` : ""}
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
