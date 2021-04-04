import { SprayPayload } from '@src/data-enums';
import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { format, localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { customElement, html, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import {
  openCoatingMenu,
  openSprayWeaponPayloadMenu,
} from '../../attacks/ammo-menus';
import { renderItemAttacks } from '../../attacks/render-item-attacks';
import { ItemCardBase } from '../item-card-base';

@customElement('item-card')
export class ItemCard extends ItemCardBase {
  static get is() {
    return 'item-card' as const;
  }

  @property({ attribute: false }) item!: ItemProxy;

  private openCoatingSelectMenu(ev: MouseEvent) {
    const { character } = this;
    'coating' in this.item && openCoatingMenu(ev, character, this.item);
  }

  private openShapeMenu(ev: MouseEvent) {
    const { item } = this;
    if (!('shapeChanging' in item)) return;
    openMenu({
      header: { heading: `${item.name} - ${localize('shape')}` },
      position: ev,
      content: [...item.shapes].map(([id, shape]) => ({
        label: shape.shapeName,
        callback: () => item.swapShape(id),
      })),
    });
  }

  private openSprayCoatingMenu(ev: MouseEvent) {
    const { character } = this;
    this.item.type === ItemType.SprayWeapon &&
      this.item.payloadUse === SprayPayload.CoatAmmunition &&
      openSprayWeaponPayloadMenu(ev, character, this.item);
  }

  renderHeaderButtons() {
    const { item } = this;
    const { editable } = item;
    return html` ${item.type === ItemType.Software && item.activation
      ? html`
          <mwc-icon-button
            class="toggle ${classMap({ activated: item.activated })}"
            icon="settings_power"
            @click=${() => item.toggleActivation()}
            data-tooltip=${format('ActionToActivate', {
              action: localize(item.activation),
            })}
            @mouseover=${tooltip.fromData}
            @focus=${tooltip.fromData}
            ?disabled=${!editable}
          ></mwc-icon-button>
        `
      : ''}
    ${item.type === ItemType.MeleeWeapon && item.equipped
      ? html` <mwc-icon-button
          class="toggle ${classMap({ activated: !!item.coating })}"
          icon="colorize"
          @click=${this.openCoatingSelectMenu}
          ?disabled=${!item.editable}
        ></mwc-icon-button>`
      : ''}
    ${item.type === ItemType.SprayWeapon &&
    item.payloadUse === SprayPayload.CoatAmmunition
      ? html` <mwc-icon-button
          class="toggle ${classMap({ activated: !!item.payload })}"
          icon="colorize"
          @click=${this.openSprayCoatingMenu}
          ?disabled=${!item.editable}
        ></mwc-icon-button>`
      : ''}
    ${'shapeChanging' in item && item.shapeChanging
      ? html`
          <mwc-icon-button
            icon="transform"
            @click=${this.openShapeMenu}
            ?disabled=${!editable}
          ></mwc-icon-button>
        `
      : ''}
    ${'toggleEquipped' in item && !item.equipped
      ? html`
          <mwc-icon-button
            @click=${() => item.toggleEquipped()}
            icon=${item.equipped ? 'archive' : 'unarchive'}
            ?disabled=${!editable}
          ></mwc-icon-button>
        `
      : ''}
    ${item.type === ItemType.Trait && item.hasTriggers
      ? html`
          <mwc-switch
            ?checked=${!!item.triggered}
            ?disabled=${!editable}
            title=${localize(item.triggered ? 'triggered' : 'trigger')}
            @change=${() => item.toggleTriggered()}
          ></mwc-switch>
        `
      : ''}`;
  }

  renderExpandedContent() {
    return html` ${renderItemAttacks(this.item)} `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-card': ItemCard;
  }
}
