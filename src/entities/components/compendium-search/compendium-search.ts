import { localize } from '@src/foundry/localization';
import { customElement, LitElement, property, html } from 'lit-element';
import styles from './compendium-search.scss';

@customElement('compendium-search')
export class CompendiumSearch extends LitElement {
  static get is() {
    return 'compendium-search' as const;
  }

  static get styles() {
    return [styles];
  }

  render() {
    return html`
      <section class="sources">
        <sl-header heading=${localize('sources')}></sl-header>
      </section>
      <section class="results"></section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'compendium-search': CompendiumSearch;
  }
}
