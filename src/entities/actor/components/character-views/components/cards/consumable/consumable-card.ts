import {
  renderLabeledCheckbox,
  renderNumberInput,
} from '@src/components/field/fields';
import { renderAutoForm } from '@src/components/form/forms';
import { AptitudeType } from '@src/data-enums';
import { ActorType, ItemType } from '@src/entities/entity-types';
import type { ConsumableItem } from '@src/entities/item/item';
import { Substance } from '@src/entities/item/proxies/substance';
import { SpecialTest } from '@src/features/tags';
import { prettyMilliseconds } from '@src/features/time';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { AptitudeCheckControls } from '@src/success-test/components/aptitude-check-controls/aptitude-check-controls';
import { createSuccessTestModifier } from '@src/success-test/success-test';
import { localImage } from '@src/utility/images';
import { customElement, html, property } from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { compact } from 'remeda';
import {
  openCoatingMenu,
  openExplosiveSubstanceMenu,
  openFirearmAmmoPayloadMenu,
} from '../../attacks/ammo-menus';
import { renderItemAttacks } from '../../attacks/render-item-attacks';
import { ItemCardBase } from '../item-card-base';
import styles from './consumable-card.scss';

@customElement('consumable-card')
export class ConsumableCard extends ItemCardBase {
  static get is() {
    return 'consumable-card' as const;
  }

  static get styles() {
    return [...super.styles, styles];
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
    const { character } = this;

    if (this.item.type === ItemType.Substance) {
      const { addiction, addictionMod } = this.item.epData;
      AptitudeCheckControls.openWindow({
        entities: { actor: character.actor },
        getState: (actor) => {
          if (actor.proxy.type !== ActorType.Character) return null;
          return {
            ego: actor.proxy.ego,
            character: actor.proxy,
            aptitude: AptitudeType.Willpower,
            modifiers: compact([
              addiction &&
                createSuccessTestModifier({
                  name: localize('addiction'),
                  value: addictionMod,
                }),
            ]),
            special: {
              type: SpecialTest.Addiction,
              source: this.item.name,
            },
          };
        },
      });
    }
  }

  private deductQuantity() {
    this.item.consumeUnit();
  }

  private increaseQuantity() {
    this.item.setQuantity(this.item.quantity + 1);
  }

  private toggleStashed() {
    return this.item.toggleStashed();
  }

  private openCoatingSelectMenu(ev: MouseEvent) {
    const { character } = this;
    'coating' in this.item && openCoatingMenu(ev, character, this.item);
  }

  private openExplosizeSubstanceMenu(ev: MouseEvent) {
    const { character } = this;
    this.item.type === ItemType.Explosive &&
      openExplosiveSubstanceMenu(ev, character, this.item);
  }

  private openFirearmAmmoPayloadMenu(ev: MouseEvent) {
    const { character } = this;
    this.item.type === ItemType.FirearmAmmo &&
      openFirearmAmmoPayloadMenu(ev, character, this.item);
  }

  renderHeaderButtons() {
    const { item } = this;
    const { editable } = item;

    return html` ${item.stashed
      ? html`
          <mwc-icon-button
            @click=${this.toggleStashed}
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
      : item.type === ItemType.ThrownWeapon
      ? html` <mwc-icon-button
          class="toggle ${classMap({ activated: !!item.coating })}"
          icon="colorize"
          @click=${this.openCoatingSelectMenu}
          ?disabled=${!item.editable}
        ></mwc-icon-button>`
      : item.type === ItemType.Explosive && item.canContainSubstance
      ? html`
          <mwc-icon-button
            class="toggle ${classMap({ activated: !!item.substance })}"
            icon=${item.substance
              ? 'radio_button_checked'
              : 'radio_button_unchecked'}
            @click=${this.openExplosizeSubstanceMenu}
            ?disabled=${!item.editable}
          ></mwc-icon-button>
        `
      : item.type === ItemType.FirearmAmmo && item.canCarryPayload
      ? html`
          <mwc-icon-button
            class="toggle ${classMap({ activated: !!item.payload })}"
            icon=${item.payload
              ? 'radio_button_checked'
              : 'radio_button_unchecked'}
            @click=${this.openFirearmAmmoPayloadMenu}
            ?disabled=${!item.editable}
          ></mwc-icon-button>
        `
      : ''}`;
  }

  renderExpandedContent() {
    const { item } = this;
    const { editable } = item;
    return html`
      ${item.type !== ItemType.Substance || !item.appliedState
        ? renderAutoForm({
            classes: 'quantity-form',
            disabled: !editable,
            props: { quantity: item.quantity },
            update: item.updateQuantity.commit,
            fields: ({ quantity }) => html`
              <div class="quantity">
                <mwc-icon-button
                  icon="keyboard_arrow_left"
                  ?disabled=${!editable || quantity.value === 0}
                  @click=${this.deductQuantity}
                ></mwc-icon-button>
                ${renderNumberInput(quantity, { min: 0, max: 9999 })}
                <mwc-icon-button
                  icon="keyboard_arrow_right"
                  ?disabled=${!editable || quantity.value === 9999}
                  @click=${this.increaseQuantity}
                ></mwc-icon-button>
              </div>
            `,
          })
        : ''}
      ${renderItemAttacks(this.item)}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'consumable-card': ConsumableCard;
  }
}
