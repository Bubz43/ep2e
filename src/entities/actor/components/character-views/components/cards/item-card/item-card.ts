import { renderLabeledCheckbox } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { Substance } from '@src/entities/item/proxies/substance';
import { currentWorldTimeMS, prettyMilliseconds } from '@src/features/time';
import { format, localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { localImage } from '@src/utility/images';
import { customElement, html, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { ItemCardBase } from '../item-card-base';

@customElement('item-card')
export class ItemCard extends ItemCardBase {
  static get is() {
    return 'item-card' as const;
  }

  @property({ attribute: false }) item!: ItemProxy;

  private async useGlandedSubstance(ev: MouseEvent) {
    if (this.item.type !== ItemType.PhysicalTech || !this.item.glandedSubstance) return;
    const { item: fabber } = this;
    const { glandedSubstance: item } = fabber;
    if (!item) return
    if (item.applicationMethods.length === 1) {
      await item.createMessage({ method: item.applicationMethods[0]! });
      fabber.printState.updateStartTime(currentWorldTimeMS())
      }
    
      else {
        let isHidden = false;
        openMenu({
          header: { heading: `${localize('use')} ${item.name}` },
          content: [
            renderAutoForm({
              props: { hidden: isHidden },
              update: ({ hidden = false }) => (isHidden = hidden),
              fields: ({ hidden }) => renderLabeledCheckbox(hidden),
            }),
            'divider',
            ...item.applicationMethods.map((method) => ({
              label: `${localize(method)} - ${localize(
                'onset',
              )}: ${prettyMilliseconds(Substance.onsetTime(method))}`,
              callback: async () => {
                await  item.createMessage({ method, hidden: isHidden });
                fabber.printState.updateStartTime(currentWorldTimeMS())

              },
            })),
          ],
          position: ev,
        });
      }
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
                  ${tech.fabricatorType
        ? html`<item-card-fabber .fabber=${tech}></item-card-fabber>`
        : ''}
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
        ? html`
            ${tech.fabricatedItem
              ? html`
                  <character-view-time-item
                    ?disabled=${!tech.editable}
                    .timeState=${tech.printState}
                  > ${!tech.printState.remaining && tech.glandedSubstance
                      ? html`
                          <mwc-icon-button
                            slot="action"
                            @click=${this.useGlandedSubstance}
                            ?disabled=${!tech.editable}
                            data-tooltip=${localize('use')}
                            @mouseover=${tooltip.fromData}
                            ><img
                              src=${localImage('icons/actions/pill-drop.svg')}
                            />
                          </mwc-icon-button>
                          
                        `
                      : ''}</character-view-time-item>
                `
              : html`<div class="available-fab">${localize('available')}</div>`}
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'item-card': ItemCard;
  }
}
