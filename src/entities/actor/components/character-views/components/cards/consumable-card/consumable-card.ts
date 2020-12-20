import {
  renderLabeledCheckbox,
  renderNumberField
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { ItemType } from '@src/entities/entity-types';
import type { ConsumableItem } from '@src/entities/item/item';
import { Substance } from '@src/entities/item/proxies/substance';
import { prettyMilliseconds } from '@src/features/time';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { localImage } from '@src/utility/images';
import { customElement, html, property } from 'lit-element';
import { ItemCardBase } from '../item-card-base';
import styles from './consumable-card.scss';

@customElement('consumable-card')
export class ConsumableCard extends ItemCardBase {
  static get is() {
    return 'consumable-card' as const;
  }

  static get styles() {
    return [...super.styles, styles]
  }

  @property({ attribute: false }) item!: ConsumableItem;

  private openSubstanceuseMenu(ev: MouseEvent) {
    const { item } = this;
    if (item.type === ItemType.Substance) {
      if (item.applicationMethods.length === 1)
        item.createMessage({ method: item.applicationMethods[0]! });
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
              callback: () => item.createMessage({ method, hidden: isHidden }),
            })),
          ],
          position: ev,
        });
      }
    }
  }

  private addictionTest() {
    if (this.item.type === ItemType.Substance) {
      notify(NotificationType.Info, `TODO WIL Check`);
    }
  }

  renderHeaderButtons() {
    const { item } = this;
    const { editable } = item;
    return html` ${item.stashed
      ? html`
          <mwc-icon-button
            @click=${() => item.toggleStashed()}
            icon=${item.stashed ? 'unarchive' : 'archive'}
            ?disabled=${!editable}
          ></mwc-icon-button>
        `
      : item.type === ItemType.Substance
      ? html`
          ${item.isAddictive
            ? html`
                <mwc-icon-button
                  @click=${this.addictionTest}
                  ?disabled=${!editable}
                  data-tooltip="${localize('addiction')} ${localize('test')}"
                  @mouseover=${tooltip.fromData}
                >
                  <img src=${localImage('icons/actions/chained-heart.svg')} />
                </mwc-icon-button>
              `
            : ''}
          <mwc-icon-button
            @click=${this.openSubstanceuseMenu}
            ?disabled=${!editable || item.quantity === 0}
            data-tooltip=${localize('use')}
            @mouseover=${tooltip.fromData}
            ><img src=${localImage('icons/actions/pill-drop.svg')} />
          </mwc-icon-button>
        `
      : ''}`;
  }

  renderExpandedContent() {
    const { item } = this;
    const { editable } = item;
    return html` ${item.type !== ItemType.Substance || !item.appliedState
      ? renderAutoForm({
          classes: 'quantity-form',
          disabled: !editable,
          props: { quantity: item.quantity },
          update: item.updateQuantity.commit,
          fields: ({ quantity }) => renderNumberField(quantity, { min: 0 }),
        })
      : ''}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'consumable-card': ConsumableCard;
  }
}
