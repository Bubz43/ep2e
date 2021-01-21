import {
  renderLabeledCheckbox,
  renderTextField,
  renderTextInput,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { ActorEP } from '@src/entities/actor/actor';
import type { ItemEP } from '@src/entities/item/item';
import { localize } from '@src/foundry/localization';
import { searchRegExp } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { chunk } from 'remeda';
import styles from './compendium-search.scss';

@customElement('compendium-search')
export class CompendiumSearch extends LitElement {
  static get is() {
    return 'compendium-search' as const;
  }

  static get styles() {
    return [styles];
  }

  @internalProperty() private results: ItemEP[] = [];

  @internalProperty() private filter = '';

  @internalProperty() private sources = {
    world: true,
    system: true,
  };

  @internalProperty() private loading = false;

  @internalProperty() private mainChunk = 0;

  @internalProperty() private secondCheck = 1;

  private async loadEntities() {
    this.loading = true;

    const items: ItemEP[] = [];

    const { isGM } = game.user;
    const { world, system } = this.sources;
    for (const pack of game.packs) {
      if (pack.private && !isGM) continue;
      const { entity, package: source } = pack.metadata;
      if (entity === 'Item' && (source === 'world' ? world : system)) {
        const entities = await pack.getContent();
        items.push(...entities);
      }
    }
    this.results = items;
    this.loading = false;
  }

  render() {
    const regex = searchRegExp(this.filter);
    console.time('filter');
    const filtered = this.results.filter((r) => r.matchRegexp(regex));
    console.timeEnd('filter');
    return html`
      <section class="sources">
        <sl-header heading=${localize('sources')}></sl-header>
        ${renderAutoForm({
          props: this.sources,
          update: (changed) => (this.sources = { ...this.sources, ...changed }),
          fields: ({ world, system }) => [
            renderLabeledCheckbox(world),
            renderLabeledCheckbox(system),
          ],
        })}
        <mwc-button
          ?disabled=${this.loading}
          class="load"
          unelevated
          @click=${this.loadEntities}
        >
          ${this.loading
            ? html`
                <mwc-circular-progress
                  density="-4"
                  indeterminate
                ></mwc-circular-progress>
              `
            : localize('load')}
        </mwc-button>
      </section>
      <section class="results">
        ${renderAutoForm({
          storeOnInput: true,
          props: { filter: this.filter },
          update: ({ filter = '' }) => (this.filter = filter),
          fields: ({ filter }) =>
            html`<label
              ><mwc-icon>search</mwc-icon>${renderTextInput(filter, {
                search: true,
                placeholder: localize('search'),
              })}</label
            >`,
        })}

        <lit-virtualizer
          class="list"
          .items=${filtered}
          .renderItem=${this.renderItem}
        ></lit-virtualizer>
    
        <!-- <li class="fallback">${localize('noResults')}.</li> -->
      </section>
    `;
  }

  private renderItem = (item: ItemEP) => {
      return html`
        <wl-list-item>
          <span>${item.proxy.fullName}</span>
          <span class="type">${item.proxy.fullType}</span></wl-list-item
        >
      `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'compendium-search': CompendiumSearch;
  }
}
