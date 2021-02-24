import { localize } from '@src/foundry/localization';
import {
  customElement,
  html,
  internalProperty,
  LitElement,
  property,
} from 'lit-element';
import type { Character } from '../../proxies/character';
import styles from './character-view-alt.scss';

const tabs = ['actions', 'inventory', 'traits', 'details'] as const;

@customElement('character-view-alt')
export class CharacterViewAlt extends LitElement {
  static get is() {
    return 'character-view-alt' as const;
  }

  static get styles() {
    return [styles];
  }

  @property({ attribute: false }) character!: Character;

  @internalProperty() private currentTab: typeof tabs[number] = 'actions';

  private setTab(ev: CustomEvent<{ index: number }>) {
    this.currentTab = tabs[ev.detail.index] ?? 'actions';
  }

  render() {
    return html`
      <div class="ego-card">EGO</div>
      <div class="sleeve-card">SLEEVE</div>
      <mwc-list class="panels">
        ${[
          'search',
          'time',
          'resleeve',
          'network',
          'recharge',
          'effects',
          'conditions',
        ].map(
          (label) => html`<mwc-list-item>${label.capitalize()}</mwc-list-item>`,
        )}
      </mwc-list>
      <div class="tabbed-section">
        <mwc-tab-bar @MDCTabBar:activated=${this.setTab}>
          ${tabs.map(
            (tab) => html` <mwc-tab label=${localize(tab)}></mwc-tab> `,
          )}
        </mwc-tab-bar>
        <div class="tab-content"></div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-alt': CharacterViewAlt;
  }
}
