import {
  renderLabeledCheckbox,
  renderTextInput,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { ActorEP } from '@src/entities/actor/actor';
import { formattedSleeveInfo } from '@src/entities/actor/sleeves';
import { ActorType } from '@src/entities/entity-types';
import type { ItemEP } from '@src/entities/item/item';
import { setDragDrop } from '@src/foundry/drag-and-drop';
import { localize } from '@src/foundry/localization';
import { searchRegExp } from '@src/utility/helpers';
import { customElement, html, LitElement, state } from 'lit-element';
import { ifDefined } from 'lit-html/directives/if-defined';
import styles from './compendium-search.scss';

@customElement('compendium-search')
export class CompendiumSearch extends LitElement {
  static get is() {
    return 'compendium-search' as const;
  }

  static get styles() {
    return [styles];
  }

  @state() private results: Entity[] = [];

  @state() private filter = '';

  @state() private sources = {
    world: true,
    system: true,
  };

  @state() private loading = false;

  private entity: 'Actor' | 'Item' = 'Item';

  private entityRenderer = 'Item';

  connectedCallback() {
    this.loading = false;
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.loading = true;
    super.disconnectedCallback();
  }

  private async loadEntities() {
    this.loading = true;
    this.results = [];
    this.entityRenderer = this.entity;

    const entries: Entity[] = [];
    const { isGM } = game.user;
    const { world, system } = this.sources;

    for (const pack of game.packs) {
      if (pack.private && !isGM) continue;
      const { entity, package: source } = pack.metadata;
      if (entity === this.entity && (source === 'world' ? world : system)) {
        const entities = await pack.getContent();
        entries.push(...entities);
      }
    }

    this.results = entries.sort((a, b) => a.name.localeCompare(b.name));
    this.loading = false;
  }

  private setDragData(ev: DragEvent) {
    if (ev.target instanceof HTMLElement) {
      const { id, collection } = ev.target.dataset;
      setDragDrop(ev, {
        type: this.entityRenderer as any,
        pack: collection as string,
        id: id as string,
      });
    }
  }

  private async loadOnEnter({ key, target }: KeyboardEvent) {
    if (key === 'Enter' && !this.results.length) {
      if (target instanceof HTMLInputElement) {
        this.filter = target.value;
        await this.updateComplete;
      }

      await this.loadEntities();
    }
  }

  render() {
    const regex = searchRegExp(this.filter);
    const filtered = this.results.filter((r) => r.matchRegexp(regex));
    return html`
      <section class="sources">
        <sl-header heading=${localize('sources')}></sl-header>
        ${renderAutoForm({
          props: this.sources,
          update: (changed) => {
            this.sources = { ...this.sources, ...changed };
          },
          fields: ({ world, system }) => [
            renderLabeledCheckbox(world),
            renderLabeledCheckbox(system),
          ],
        })}
        ${renderAutoForm({
          props: { entity: this.entity },
          update: ({ entity }) => {
            if (entity) this.entity = entity;
          },
          fields: ({ entity }) => html`
            <span class="entity-label">${entity.label}</span>
            ${['Actor', 'Item'].map(
              (ent) => html`
                <mwc-formfield label=${ent}>
                  <mwc-radio
                    name="entity"
                    value=${ent}
                    ?checked=${entity.value === ent}
                  ></mwc-radio
                ></mwc-formfield>
              `,
            )}
          `,
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
          noDebounce: true,
          props: { filter: this.filter },
          update: ({ filter = '' }) => (this.filter = filter),
          fields: ({ filter }) =>
            html`<label @keydown=${this.loadOnEnter}
              ><mwc-icon>search</mwc-icon>${renderTextInput(filter, {
                search: true,
                placeholder: localize('filter'),
              })}</label
            >`,
        })}
        ${this.loading
          ? ''
          : filtered.length === 0
          ? html` <p class="fallback">${localize('noResults')}.</p> `
          : html` <lit-virtualizer
              @dragstart=${this.setDragData}
              class="list"
              .items=${filtered}
              .renderItem=${this.entityRenderer === 'Item'
                ? this.renderItem
                : this.renderActor}
            ></lit-virtualizer>`}
      </section>
    `;
  }

  private renderItem = (item: ItemEP) => {
    return html`
      <wl-list-item
        draggable="true"
        data-collection=${ifDefined(item.compendium?.collection)}
        data-id=${item.id}
        clickable
        @click=${() => item.sheet.render(true)}
      >
        <span>${item.proxy.fullName}</span>
        <span class="type">${item.proxy.fullType}</span></wl-list-item
      >
    `;
  };

  private renderActor = (actor: ActorEP) => {
    const { proxy } = actor;
    const sleeve = proxy.type === ActorType.Character ? proxy.sleeve : proxy;
    return html`
      <wl-list-item
        draggable="true"
        data-collection=${ifDefined(actor.compendium?.collection)}
        data-id=${actor.id}
        clickable
        @click=${() => actor.sheet.render(true)}
      >
        <img slot="before" src=${proxy.img} loading="lazy" width="20px" />
        <span>${proxy.name}</span>
        <span class="type">
          ${localize(proxy.type)}
          ${sleeve ? `/ ${formattedSleeveInfo(sleeve).join(' - ')}` : ''}
        </span>
      </wl-list-item>
    `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'compendium-search': CompendiumSearch;
  }
}
