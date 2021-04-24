import { createMessage } from '@src/chat/create-message';
import { renderLabeledCheckbox } from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import type { PhysicalTech } from '@src/entities/item/proxies/physical-tech';
import { Substance } from '@src/entities/item/proxies/substance';
import { currentWorldTimeMS, prettyMilliseconds } from '@src/features/time';
import { format, localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { localImage } from '@src/utility/images';
import { customElement, html, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { requestCharacter } from '../../../character-request-event';
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

  private useItem() {
    const { token } = requestCharacter(this);
    createMessage({
      data: {
        header: {
          heading: this.item.name,
          img: this.item.nonDefaultImg,
          description: this.item.description,
          subheadings: [
            localize('use'),
            `${localize(this.item.activationAction)} ${localize('action')}`,
          ],
        },
        techUse: {
          tech: {
            id: this.item.id,
            name: this.item.fullName,
          },
          effects: this.item.activatedEffects,
          resistCheck: this.item.epData.resistEffectsCheck,
          duration: this.item.epData.usedEffectsDuration,
        },
      },
      entity: token || this.character,
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
        : item.hasUseActivation
        ? html`
            <mwc-icon-button
              icon="touch_app"
              @click=${this.useItem}
              data-tooltip=${format('ActionToActivate', {
                action: localize(item.activationAction),
              })}
              @mouseover=${tooltip.fromData}
              @focus=${tooltip.fromData}
              ?disabled=${!editable}
            ></mwc-icon-button>
          `
        : ''}
      ${item.equipped
        ? ''
        : html`
            <mwc-icon-button
              @click=${this.toggleEquipped}
              icon=${item.equipped ? 'archive' : 'unarchive'}
              ?disabled=${!editable}
            ></mwc-icon-button>
          `}
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
                  <time-state-item
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
                      : ''}</time-state-item
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
