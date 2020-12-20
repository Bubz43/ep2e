import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { format, localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { customElement, html, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { ItemCardBase } from '../item-card-base';

@customElement('item-card')
export class ItemCard extends ItemCardBase {
  static get is() {
    return 'item-card' as const;
  }

  @property({ attribute: false }) item!: ItemProxy;

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
    ${item.type === ItemType.PhysicalTech && item.hasToggleActivation
      ? html`
          <mwc-icon-button
            class="toggle ${classMap({ activated: item.activated })}"
            icon="power_settings_new"
            @click=${() => item.toggleActivation()}
            data-tooltip=${format('ActionToActivate', {
              action: localize(item.activationAction),
            })}
            @mouseover=${tooltip.fromData}
            @focus=${tooltip.fromData}
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
      : 'toggleStashed' in item && item.stashed
      ? html`
          <mwc-icon-button
            @click=${() => item.toggleStashed()}
            icon=${item.stashed ? 'unarchive' : 'archive'}
            ?disabled=${!editable}
          ></mwc-icon-button>
        `
      : ''}`;
  }

  renderExpandedContent() {
    return this.item.type === ItemType.PhysicalTech
      ? this.renderTechParts(this.item)
      : html``;
  }

  private renderTechParts(tech: PhysicalTech) {
    /*
      ${tech.slaved
              ? ''
              : html`
                  <health-item .health=${tech.firewallHealth}></health-item>
                `}
    */
    return html`
      ${tech.deviceType
        ? html` <health-item .health=${tech.meshHealth}></health-item> `
        : ''}
      ${tech.hasOnboardALI && tech.onboardALI?.trackMentalHealth
        ? html`
            <health-item .health=${tech.onboardALI.mentalHealth}></health-item>
          `
        : ''}
      ${tech.fabricatorType
        ? html`<item-card-fabber .fabber=${tech}></item-card-fabber>`
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-card': ItemCard;
  }
}
