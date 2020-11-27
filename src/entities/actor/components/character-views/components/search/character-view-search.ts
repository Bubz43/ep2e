import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { Character } from '@src/entities/actor/proxies/character';
import { idProp } from '@src/features/feature-helpers';
import { DropType, setDragDrop } from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { notEmpty, searchRegExp } from '@src/utility/helpers';
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
import { compact, identity, sortBy } from 'remeda';
import { stopEvent } from 'weightless';
import { ItemCard } from '../../../item-card/item-card';
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

  async connectedCallback() {
    super.connectedCallback();
    await this.updateComplete;
    setTimeout(() => this.searchInput.focus(), 100);
  }

  private getFilteredItems(regex: RegExp) {
    return [...this.character.items.values()].filter((proxy) =>
      proxy.matchRegexp(regex),
    );
  }

  private dragItemCard(ev: DragEvent) {
    if (ev.currentTarget instanceof ItemCard) {
      setDragDrop(ev, {
        type: DropType.Item,
        ...this.character.actor.identifiers,
        data: ev.currentTarget.item.data,
      });
    }
  }

  render() {
    const { search: searchString } = this;
    const search = searchString.trim();
    const showItems = notEmpty(search);
    const items = showItems && this.getFilteredItems(searchRegExp(search));
    return html`
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
      ${this.hasUpdated && items
        ? html`
            <ul class="results-list">
              ${repeat(
                sortBy(items, (i) => i.name),
                idProp,
                (proxy) =>
                  html`<item-card
                    allowDrag
                    expanded
                    noAnimate
                    @dragstart=${this.dragItemCard}
                    .item=${proxy}
                  ></item-card>`,
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
