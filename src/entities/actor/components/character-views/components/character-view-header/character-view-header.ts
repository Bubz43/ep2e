import { Placement } from '@src/components/popover/popover-options';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { notEmpty } from '@src/utility/helpers';
import { customElement, html, LitElement, property } from 'lit-element';
import {
  CharacterDrawerRenderer,
  CharacterDrawerRenderEvent
} from '../../character-drawer-render-event';
import styles from './character-view-header.scss';

@customElement('character-view-header')
export class CharacterViewHeader extends LitElement {
  static get is() {
    return 'character-view-header' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({
    attribute: false,
    hasChanged(value, oldValue) {
      return !value || !oldValue || (value === oldValue)
    },
  })
  token?: MaybeToken;

  private requestDrawerRender(ev: Event) {
    const { renderer } = (ev.currentTarget as HTMLElement).dataset;
    this.dispatchEvent(
      new CharacterDrawerRenderEvent(renderer as CharacterDrawerRenderer),
    );
  }

  private updateFromChange() {
    this.requestUpdate()
  }

  render() {
    const img = this.token?.data.img || this.character.img;
    const name = this.token?.data.name || this.character.name;
    return html`
      <img src=${img} />
      <h2>${name}</h2>
      <div class="actions">
        <mwc-icon-button
          ?disabled=${this.character.disabled}
          data-tooltip=${localize('resleeve')}
          icon="groups"
          @mouseenter=${tooltip.fromData}
          @focus=${tooltip.fromData}
          data-renderer=${CharacterDrawerRenderer.Resleeve}
          @click=${this.requestDrawerRender}
        ></mwc-icon-button>

        <mwc-button
          class="effects-toggle"
          dense
          label="${localize('effects')}: ${this.character.appliedEffects.total}"
          data-renderer=${CharacterDrawerRenderer.Effects}
          @click=${this.requestDrawerRender}
        ></mwc-button>

        <sl-popover
          class="restore-popover"
          .closeEvents=${['option-selected']}
          @trash-changed=${this.updateFromChange}
          placement=${Placement.Right}
          .renderOnDemand=${this.renderItemTrash}
          unpadded
        >
          <mwc-icon-button
            icon="restore_from_trash"
            class="restore-button"
            ?disabled=${!notEmpty(this.character.actor.itemTrash) ||
            this.character.disabled}
            slot="base"
          >
          </mwc-icon-button>
        </sl-popover>
      </div>
    `;
  }

  private renderItemTrash = () => {
    return html` <item-trash .proxy=${this.character}></item-trash> `;
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'character-view-header': CharacterViewHeader;
  }
}
