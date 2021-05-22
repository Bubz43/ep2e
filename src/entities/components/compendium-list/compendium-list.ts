import { renderTextInput } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { ItemEP } from '@src/entities/item/item';
import { setDragDrop } from '@src/foundry/drag-and-drop';
import type { FoundryDoc } from '@src/foundry/foundry-cont';
import { localize } from '@src/foundry/localization';
import { openMenu } from '@src/open-menu';
import { clickIfEnter, searchRegExp } from '@src/utility/helpers';
import { customElement, html, LitElement, property, state } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import { repeat } from 'lit-html/directives/repeat';
import { idProp } from '../../../features/feature-helpers';
import styles from './compendium-list.scss';

@customElement('compendium-list')
export class CompendiumList extends LitElement {
  static get is() {
    return 'compendium-list' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) compendium!: Compendium;

  @property({ attribute: false, type: Array }) content!: (FoundryDoc & {
    img?: string;
  })[];

  @state() private search = '';

  private openedEntities = new Map<string, FoundryDoc>();

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
    return this.content.find((entity) => entity.id === id);
  }

  private entryMenu(ev: MouseEvent) {
    const { entryId } = (ev.currentTarget as HTMLElement).dataset;
    if (!entryId) return;
    const entry = this.findEntity(entryId);
    if (!entry) return;
    console.log(this.compendium, this.compendium.collection);
    openMenu({
      content: [
        {
          label: game.i18n.localize('COMPENDIUM.ImportEntry'),
          icon: html`<i class="fas fa-download"></i>`,
          disabled:
            !game.user.isGM &&
            !game.user.can(
              `${(
                this.compendium.collection.documentName as string
              ).toLocaleUpperCase()}_CREATE`,
            ),
          callback: () => {
            const collection = game.collections.get(
              this.compendium.collection.documentName,
            );
            collection?.importFromCompendium(
              this.compendium.collection,
              entryId,
              {},
              { renderSheet: true },
            );
          },
        },
        {
          label: game.i18n.localize('COMPENDIUM.DeleteEntry'),
          icon: html`<i class="fas fa-trash"></i>`,
          disabled: this.compendium.locked || !game.user.isGM,
          callback: () => {
            Dialog.confirm({
              title: `${game.i18n.localize('COMPENDIUM.DeleteEntry')} ${
                entry.name
              }`,
              content: game.i18n.localize('COMPENDIUM.DeleteConfirm'),
              yes: () => this.compendium.collection.delete(entryId),
            } as any);
          },
        },
      ],
      position: ev,
      header: { heading: entry.name },
    });
  }

  private setDragData(ev: DragEvent) {
    const { collection } = this.compendium;
    const { entryId } = (ev.currentTarget as HTMLElement).dataset;
    setDragDrop(ev, {
      type: collection.documentName,
      pack: collection.collection,
      id: entryId as string,
    });
  }

  private async openEntrySheet(ev: Event) {
    const { entryId } = (ev.currentTarget as HTMLElement).dataset;
    if (!entryId) return;
    (await this.compendium.collection.getDocument(entryId)).sheet.render(true);
    // const opened = this.openedEntities.get(entryId);
    // if (opened) {
    //   console.log(
    //     'opened',
    //     opened.name,
    //     this.content.find((entry) => entry.id === entryId)?.name,
    //   );
    // }
    // const entry =
    //   this.openedEntities.get(entryId) ||
    //   this.content.find((entry) => entry.id === entryId);

    // if (entry) {
    //   entry.prepareData();
    //   this.openedEntities.set(entryId, entry);
    //   (entry.sheet as EntitySheet | null)?.render(true);
    // }
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
              placeholder: `${
                this.compendium.collection.documentName
              } ${localize('search')}`,
            })}</label
          >`,
      })}
      ${this.renderItems()}
    `;
  }

  private renderItems() {
    const { content } = this;

    const isItem = this.compendium.collection.documentName === 'Item';
    const regex = searchRegExp(this.search);
    const canDrag = this.compendium._canDragStart('');

    return html`
      <mwc-list>
        ${repeat(content, idProp, (entry) => {
          const type = isItem ? (entry as ItemEP).proxy.fullType : '';
          const finalName = isItem
            ? (entry as ItemEP).proxy.fullName
            : entry.name;
          const hidden = !regex.test(finalName);
          // const hidden = "matchRegexp" in entry ? !entry.matchRegexp(regex) :  !entry.matchRegexp(regex);
          if (hidden) return '';
          const img = typeof entry.img === 'string' ? entry.img : undefined;
          return html`
            <mwc-list-item
              draggable=${canDrag ? 'true' : 'false'}
              graphic=${ifDefined(img ? 'avatar' : undefined)}
              ?twoline=${!!type}
              data-entry-id=${entry.id}
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
        })}
      </mwc-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'compendium-list': CompendiumList;
  }
}
