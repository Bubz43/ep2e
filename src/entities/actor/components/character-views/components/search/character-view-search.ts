import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { Character } from '@src/entities/actor/proxies/character';
import { setDragSource, DropType } from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
  query,
  eventOptions,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { compact, identity } from 'remeda';
import { stopEvent } from 'weightless';
import styles from './character-view-search.scss';

@customElement('character-view-search')
export class CharacterViewSearch extends LitElement {
  static get is() {
    return 'character-view-search' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @internalProperty() private search = '';

  @query('input') private searchInput!: HTMLInputElement;

  private filters = new Set<string>();

  async connectedCallback() {
    super.connectedCallback();
    await this.updateComplete;
    setTimeout(() => this.searchInput.focus(), 100);
  }

  @eventOptions({ capture: true })
  private addFilter(ev: KeyboardEvent) {
    setTimeout(() => {
      if (ev.key === 'Enter') {
        if (this.search.trim()) {
          this.filters.add(this.search.trim());
          this.search = '';
        } else this.requestUpdate();
      }
    }, 10);
  }

  private removeFilter(filter: string) {
    this.filters.delete(filter);
    if (this.search === filter) this.search = '';
    this.requestUpdate();
  }

  private getFilteredItems(regexs: RegExp[]) {
    return [...this.character.items.values()].filter((proxy) =>
      regexs.every((regex) => proxy.matchRegexp(regex)),
    );
  }

  render() {
    const { filters, search: searchString } = this;
    const search = searchString.trim();
    const strings = new Set(compact([...filters, search]));
    const showItems = notEmpty(strings);
    const regexs = [...strings].map((string) => new RegExp(string, 'i'));
    const items = showItems && this.getFilteredItems(regexs);
    return html`
      <header @keydown=${this.addFilter}>
        ${renderAutoForm({
          classes: 'controls',
          storeOnInput: true,
          props: { search },
          update: ({ search = '' }) => (this.search = search),
          fields: ({ search }) => html`
            <label>
              <mwc-icon>search</mwc-icon>
              ${renderTextInput(search, {
                search: true,
                maxLength: 35,
                placeholder: `${localize('search')} ${localize('components')}`,
              })}
            </label>
          `,
        })}
      </header>

      <sl-animated-list class="filters">
        ${repeat(
          strings,
          (string) => string === search || string,
          (filter) => html`
            <mwc-button
              dense
              unelevated
              tabindex="-1"
              class="filter"
              @click=${() => this.removeFilter(filter)}
            >
              ${filter}
            </mwc-button>
          `,
        )}
      </sl-animated-list>

      ${this.hasUpdated && items
        ? html`
            <ul class="results-list">
              ${repeat(
                items,
                identity,
                (proxy) => html` <wl-list-item
                  draggable="true"
                  @dragstart=${(ev: DragEvent) => {
                    setDragSource(ev, {
                      ...this.character.actor.identifiers,
                      type: DropType.Item,
                      data: proxy.data,
                    });
                  }}
                  clickable
                  class="item-proxy"
                  @click=${proxy.openForm}
                >
                  ${proxy.nonDefaultImg
                    ? html`
                        <img slot="before" height="32px" src=${proxy.img} />
                      `
                    : ''}
                  <span
                    >${proxy.fullName}
                    <span class="proxy-type">${proxy.fullType}</span></span
                  >
                  <delete-button
                    slot="after"
                    @delete=${proxy.deleteSelf}
                    @click=${stopEvent}
                  ></delete-button>
                </wl-list-item>`,
              )}
              ${notEmpty(items)
                ? ''
                : html`<li class="no-results">${localize('noResults')}</li>`}
            </ul>
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-search': CharacterViewSearch;
  }
}
