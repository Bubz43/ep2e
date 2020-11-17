import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { ItemEP } from '@src/entities/item/item';
import { setDragDrop } from '@src/foundry/drag-and-drop';
import type { EntitySheet } from '@src/foundry/foundry-cont';
import { localize } from '@src/foundry/localization';
import { importFromCompendium } from '@src/foundry/misc-helpers';
import { openMenu } from '@src/open-menu';
import { searchRegExp, clickIfEnter } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import { compact } from 'remeda';
import styles from './compendium-list.scss';

@customElement('compendium-list')
export class CompendiumList extends LitElement {
  static get is() {
    return 'compendium-list' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) compendium!: Compendium;

  @property({ attribute: false, type: Array }) content!: (Entity & {
    img?: string;
  })[];

  @internalProperty() search = '';

  private openedEntities = new Map<string, Entity>();

  disconnectedCallback() {
    this.openedEntities.clear();
    super.disconnectedCallback();
  }

  firstUpdated() {
    this.addEventListener('drop', (ev) => {
      if (!this.compendium.locked && this.compendium._canDragDrop('')) {
        this.compendium._onDrop(ev);
      }
    });
  }

  private findEntity(id: string) {
    return this.content.find((entity) => entity._id === id);
  }

  private entryMenu(ev: MouseEvent) {
    const { entryId } = (ev.currentTarget as HTMLElement).dataset;
    if (!entryId) return;
    const entry = this.findEntity(entryId);
    if (!entry) return;
    openMenu({
      content: [
        {
          label: game.i18n.localize('COMPENDIUM.ImportEntry'),
          icon: html`<i class="fas fa-download"></i>`,
          disabled:
            !game.user.isGM &&
            !game.user.can(
              `${(this.compendium
                .entity as string).toLocaleUpperCase()}_CREATE`,
            ),
          callback: () => importFromCompendium(this.compendium, entryId),
        },
        {
          label: game.i18n.localize('COMPENDIUM.DeleteEntry'),
          icon: html`<i class="fas fa-trash"></i>`,
          disabled: this.compendium.locked || !game.user.isGM,
          callback: () => {
            Dialog.confirm(
              {
                title: `${game.i18n.localize('COMPENDIUM.DeleteEntry')} ${
                  entry.name
                }`,
                content: game.i18n.localize('COMPENDIUM.DeleteConfirm'),
                yes: () => this.compendium.deleteEntity(entryId),
              } as any,
              {},
            );
          },
        },
      ],
      position: ev,
      header: { heading: entry.name },
    });
  }

  private setDragData(ev: DragEvent) {
    const { entity, collection } = this.compendium;
    const { entryId } = (ev.currentTarget as HTMLElement).dataset;
    setDragDrop(ev, {
      type: entity,
      pack: collection as string,
      id: entryId as string,
    });
  }

  private openEntrySheet(ev: Event) {
    const { entryId } = (ev.currentTarget as HTMLElement).dataset;
    if (!entryId) return;
    const entry =
      this.openedEntities.get(entryId) ||
      this.content.find((entry) => entry._id === entryId);
    if (entry) {
      this.openedEntities.set(entryId, entry);
      (entry.sheet as EntitySheet | null)?.render(true);
    }
  }

  render() {
    return html`
      ${renderAutoForm({
        storeOnInput: true,
        props: { search: this.search },
        update: ({ search = '' }) => (this.search = search),
        fields: ({ search }) =>
          html`<label
            ><mwc-icon>search</mwc-icon>${renderTextInput(search, {
              search: true,
              placeholder: `${this.compendium.entity} ${localize('search')}`,
            })}</label
          >`,
      })}
      ${this.renderItems()}
    `;
  }

  private renderItems() {
    const { content } = this;

    const isItem = this.compendium.entity === 'Item';
    const regex = searchRegExp(this.search);
    const canDrag = this.compendium._canDragStart('');

    return html`
      <mwc-list>
        ${repeat(
          content,
          ({ _id }) => _id,
          (entry) => {
            const type = isItem ? (entry as ItemEP).proxy.fullType : '';
            const finalName = isItem
              ? (entry as ItemEP).proxy.fullName
              : entry.name;
            const hidden = !entry.matchRegexp(regex);
            if (hidden) return '';
            const img = typeof entry.img === 'string' ? entry.img : undefined;
            return html`
              <mwc-list-item
                draggable=${canDrag ? 'true' : 'false'}
                graphic=${ifDefined(img ? 'avatar' : undefined)}
                ?twoline=${!!type}
                data-entry-id=${entry._id}
                @click=${this.openEntrySheet}
                @contextmenu=${this.entryMenu}
                @dragstart=${this.setDragData}
                @keydown=${clickIfEnter}
              >
                ${img
                  ? html`
                      <img
                        src=${img}
                        class=${img === CONST.DEFAULT_TOKEN ? 'default' : ''}
                        loading="lazy"
                        width="40px"
                        slot="graphic"
                      />
                    `
                  : ''}

                <span title=${finalName}>${finalName}</span>
                ${type ? html`<span slot="secondary">${type}</span>` : ''}
              </mwc-list-item>
            `;
          },
        )}
      </mwc-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'compendium-list': CompendiumList;
  }
}
