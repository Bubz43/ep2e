import { Placement } from '@src/components/popover/popover-options';
import { RechargeType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import { ActorType } from '@src/entities/entity-types';
import { localize } from '@src/foundry/localization';
import { notEmpty } from '@src/utility/helpers';
import { customElement, LitElement, property, html } from 'lit-element';
import { range } from 'remeda';
import {
  CharacterDrawerRenderer,
  CharacterDrawerRenderEvent,
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
    hasChanged() {
      return true;
    },
  })
  token?: MaybeToken;

  private requestDrawerRender(ev: Event) {
    const { renderer } = (ev.currentTarget as HTMLElement).dataset;
    this.dispatchEvent(
      new CharacterDrawerRenderEvent(renderer as CharacterDrawerRenderer),
    );
  }

  render() {
    const img = this.token?.data.img || this.character.img;
    const name = this.token?.data.name || this.character.name;
    return html`
      <img src=${img} />
      <h2>${name}</h2>
      <div class="actions">
        <mwc-button
          class="effects-toggle"
          dense
          data-renderer=${CharacterDrawerRenderer.Effects}
          label="${localize('effects')}: ${this.character.appliedEffects.total}"
        ></mwc-button>

        <sl-popover
          class="restore-popover"
          .closeEvents=${['option-selected']}
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
