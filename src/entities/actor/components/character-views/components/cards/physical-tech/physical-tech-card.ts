import { renderLabeledCheckbox } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { ItemType } from '@src/entities/entity-types';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { Substance } from '@src/entities/item/proxies/substance';
import { currentWorldTimeMS, prettyMilliseconds } from '@src/features/time';
import { format, localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { localImage } from '@src/utility/images';
import { customElement, LitElement, property, html } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { ItemCardBase } from '../item-card-base';
import styles from './physical-tech-card.scss';

@customElement('physical-tech-card')
export class PhysicalTechCard extends ItemCardBase {
  static get is() {
    return 'physical-tech-card' as const;
  }

  static get styles() {
    return [...super.styles, styles];
  }

  @property({ attribute: false }) item!: PhysicalTech;

  private toggleEquipped() {
    this.item.toggleEquipped();
  }

  private toggleActivation() {
    this.item.toggleActivation();
  }

  private async useGlandedSubstance(ev: MouseEvent) {
    if (!this.item.glandedSubstance) return;
    const { item: fabber } = this;
    const { glandedSubstance: item } = fabber;
    if (!item) return;

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
            await item.createMessage({ method, hidden: isHidden });
            fabber.printState.updateStartTime(currentWorldTimeMS());
          },
        })),
      ],
      position: ev,
    });
  }

  renderHeaderButtons() {
    const { item } = this;
    const { editable } = item;

    return html`
      ${item.hasToggleActivation
        ? html`
            <mwc-icon-button
              class="toggle ${classMap({ activated: item.activated })}"
              icon="power_settings_new"
              @click=${this.toggleActivation}
              data-tooltip=${format('ActionToActivate', {
                action: localize(item.activationAction),
              })}
              @mouseover=${tooltip.fromData}
              @focus=${tooltip.fromData}
              ?disabled=${!editable}
            ></mwc-icon-button>
          `
        : ''}

      <mwc-icon-button
        @click=${this.toggleEquipped}
        icon=${item.equipped ? 'archive' : 'unarchive'}
        ?disabled=${!editable}
      ></mwc-icon-button>
    `;
  }

  renderExpandedContent() {
    const { item } = this;
    return html`
      ${item.deviceType
        ? html` <health-item .health=${item.meshHealth}></health-item> `
        : ''}
      ${item.hasOnboardALI && item.onboardALI?.trackMentalHealth
        ? html`
            <health-item .health=${item.onboardALI.mentalHealth}></health-item>
          `
        : ''}
      ${item.fabricatorType
        ? html`
            ${item.fabricatedItem
              ? html`
                  <character-view-time-item
                    ?disabled=${!item.editable}
                    .timeState=${item.printState}
                  >
                    ${!item.printState.remaining && item.glandedSubstance
                      ? html`
                          <mwc-icon-button
                            slot="action"
                            @click=${this.useGlandedSubstance}
                            ?disabled=${!item.editable}
                            data-tooltip=${localize('use')}
                            @mouseover=${tooltip.fromData}
                            ><img
                              src=${localImage('icons/actions/pill-drop.svg')}
                            />
                          </mwc-icon-button>
                        `
                      : ''}</character-view-time-item
                  >
                `
              : html`<div class="available-fab">${localize('available')}</div>`}
          `
        : ''}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'physical-tech-card': PhysicalTechCard;
  }
}
