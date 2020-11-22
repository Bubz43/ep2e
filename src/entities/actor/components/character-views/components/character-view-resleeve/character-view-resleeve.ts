import type { Character } from '@src/entities/actor/proxies/character';
import { Sleeve, gameSleeves } from '@src/entities/actor/sleeves';
import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { idProp } from '@src/features/feature-helpers';
import { localize } from '@src/foundry/localization';
import { EP } from '@src/foundry/system';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  LitElement,
  property,
  html,
  internalProperty,
} from 'lit-element';
import { repeat } from 'lit-html/directives/repeat';
import { reject, sortBy } from 'remeda';
import styles from './character-view-resleeve.scss';

@customElement('character-view-resleeve')
export class CharacterViewResleeve extends LitElement {
  static get is() {
    return 'character-view-resleeve' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @internalProperty() private selectedSleeve: Sleeve | null = null;

  private keptItems = new Set<string>();

  disconnectedCallback() {
    this.keptItems.clear();
    this.selectedSleeve = null;
    super.connectedCallback();
  }

  private toggleKeptItem(id: string) {
    if (this.keptItems.has(id)) this.keptItems.delete(id);
    else this.keptItems.add(id);
  }
  private async resleeve() {
    if (!this.selectedSleeve) return;
    const { sleeve } = this.character;
    if (sleeve) {
      if (sleeve.type !== this.selectedSleeve.type) {
        this.character.updater.prop('flags', EP.Name, sleeve.type).store(null);
      }
      if (notEmpty(sleeve.items)) {
        await this.character.itemOperations.remove(
          ...reject([...sleeve.items.keys()], (id) => this.keptItems.has(id)),
        );
      }
    }

    const { items } = this.selectedSleeve;
    const data = this.selectedSleeve.dataCopy();
    data.items = [];
    // TODO Brain
    await this.character.itemOperations.add(
      ...[...items.values()].map((item) => item.getDataCopy(false)),
    );
    await this.character.updater
      .prop('flags', EP.Name, this.selectedSleeve.type)
      .commit(data);

    this.keptItems.clear();
  }

  private openSelectionList() {
    openMenu({
      content: gameSleeves().map((sleeve) => ({
        label: `${sleeve.name} (${localize(sleeve.type)})`,
        activated: this.selectedSleeve === sleeve,
        callback: () => (this.selectedSleeve = sleeve),
      })),
    });
  }

  render() {
    return html`
      <h2>${localize('resleeve')}</h2>
      ${this.character.sleeve ? this.renderCurrent(this.character.sleeve) : ''}
      <sl-header heading=${localize('selected')}>
        <mwc-icon-button
          slot="action"
          icon="list"
          @click=${this.openSelectionList}
        ></mwc-icon-button>
      </sl-header>
      ${this.selectedSleeve ? this.renderSelected(this.selectedSleeve) : ''}
      <div class="controls">
        <submit-button
          @click=${this.resleeve}
          ?complete=${!!this.selectedSleeve}
          label=${localize('resleeve')}
        ></submit-button>
      </div>
    `;
  }

  private renderCurrent(sleeve: Sleeve) {
    return html`
      <sl-header heading=${localize('current')}></sl-header>
      <mwc-list class="current-sleeve" multi>
        <mwc-list-item graphic="medium" twoline @click=${sleeve.openForm}>
          <img slot="graphic" src=${sleeve.img} />
          <span>${sleeve.name}</span>
          <span slot="secondary">${localize(sleeve.type)}</span>
        </mwc-list-item>
        <li divider></li>

        ${repeat(
          sortBy([...sleeve.items.values()], (i) => i.type === ItemType.Trait),
          idProp,
          (item) => {
            if (item.type === ItemType.Trait) return this.renderItem(item);
            const selected = this.keptItems.has(item.id);
            return html`
              <mwc-check-list-item
                class="item"
                ?selected=${selected}
                @click=${() => this.toggleKeptItem(item.id)}
              >
                <span
                  >${item.fullName}
                  <span class="item-type">${item.fullType}</span></span
                >
              </mwc-check-list-item>
            `;
          },
        )}
      </mwc-list>
    `;
  }

  private renderSelected(sleeve: Sleeve) {
    return html`
      <mwc-list class="selected-sleeve">
        <mwc-list-item graphic="medium" twoline @click=${sleeve.openForm}>
          <img slot="graphic" src=${sleeve.img} />
          <span>${sleeve.name}</span>
          <span slot="secondary">${localize(sleeve.type)}</span>
        </mwc-list-item>
        <li divider></li>
        ${repeat(sleeve.items.values(), idProp, this.renderItem)}
      </mwc-list>
    `;
  }

  private renderItem = (item: ItemProxy) => {
    return html` <mwc-list-item class="item" noninteractive>
      <span
        >${item.fullName}
        <span class="item-type"
          >${item.type === ItemType.Trait
            ? localize(item.type)
            : item.fullType}</span
        ></span
      >
    </mwc-list-item>`;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-resleeve': CharacterViewResleeve;
  }
}
