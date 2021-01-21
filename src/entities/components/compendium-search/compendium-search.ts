import { renderLabeledCheckbox, renderTextField } from '@src/components/field/fields';
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
import styles from './compendium-search.scss';

@customElement('compendium-search')
export class CompendiumSearch extends LitElement {
  static get is() {
    return 'compendium-search' as const;
  }

  static get styles() {
    return [styles];
  }

  @internalProperty() private actors: ActorEP[] = [];

  @internalProperty() private items: ItemEP[] = [];

  @internalProperty() private filter = '';

  @internalProperty() private sources = {
    world: true,
    system: true,
  };

  @internalProperty() private loading = false;

  private async loadEntities() {
    this.loading = true;

    const items: ItemEP[] = [];

    const { isGM } = game.user;
    const { world, system } = this.sources;
    for (const pack of game.packs) {
      if (pack.private && !isGM) continue;
      const { entity, package: source } = pack.metadata;
     if (entity === "Item" && (source === "world" ? world : system)) {
      const entities = await pack.getContent();
      items.push(...entities)
     }
    }
    this.items = items;
    this.loading = false;
  }

  render() {
    const regex = searchRegExp(this.filter);
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
        <mwc-button class="load" unelevated>
          ${this.loading
            ? html`
                <mwc-circular-progress indeterminate></mwc-circular-progress>
              `
            : localize('load')}
        </mwc-button>
      </section>
      <section class="results">
      ${renderAutoForm({ 
        props: { filter: this.filter },
        update: ({ filter = ""}) => (this.filter = filter),
        fields: ({ filter}) => renderTextField(filter, { search: true })
      })}
        <mwc-list>
          ${this.items.map((result) => {
            if (!result.matchRegexp(regex)) return '';
            return html`
              <mwc-list-item twoline graphic="icon">
                <img src=${result.img} />
                <span>${result.proxy.fullName}</span>
                <span slot="secondary">${result.proxy.fullType}</span>
              </mwc-list-item>
            `;
          })}
        </mwc-list>

        <li class="fallback">${localize('noResults')}.</li>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'compendium-search': CompendiumSearch;
  }
}
