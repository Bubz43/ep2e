import { SprayPayload } from '@src/data-enums';
import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { prettyMilliseconds } from '@src/features/time';
import { NotificationType, notify } from '@src/foundry/foundry-apps';
import { format, localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { css, customElement, html, property } from 'lit-element';
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

  static get styles() {
    return [
      ...super.styles,
      css`
        .shape-change {
          position: relative;
        }
        .shape-change .toggle {
          z-index: 1;
          position: relative;
        }
        .change-progress {
          position: absolute;
          top: -0.35rem;
          left: -0.4rem;
          --mdc-circular-progress-track-color: var(--color-border);
          --mdc-theme-primary: var(--color-secondary);
        }
      `,
    ];
  }

  @property({ attribute: false }) item!: ItemProxy;

  connectedCallback() {
    Hooks.on('updateWorldTime', this._updateFromWorldTime);
    super.connectedCallback();
  }

  disconnectedCallback() {
    Hooks.off('updateWorldTime', this._updateFromWorldTime);
    super.disconnectedCallback();
  }

  private _updateFromWorldTime = () => this.requestUpdate();

  private openCoatingSelectMenu(ev: MouseEvent) {
    const { character } = this;
    'coating' in this.item && openCoatingMenu(ev, character, this.item);
  }

  private openShapeMenu(ev: MouseEvent) {
    const { item } = this;
    if (!('shapeChanging' in item) || !item.shapeChanging) return;
    const { transformTimer } = item;
    if (transformTimer?.completed) {
      const shapeId = item.epFlags?.transformation?.shapeId;
      if (!shapeId || !item.shapes.has(shapeId)) {
        notify(
          NotificationType.Error,
          `${localize('shape')} ${localize('missing')}`,
        );
        item.cancelTransformation();
      } else item.swapShape(shapeId);
    } else {
      openMenu({
        header: {
          heading:
            transformTimer?.label || `${item.name} - ${localize('shape')}`,
        },
        position: ev,
        content: transformTimer
          ? [
              {
                label: localize('completeTransformation'),
                icon: html`<mwc-icon>fast_forward</mwc-icon>`,
                callback: () => {
                  const shapeId = item.epFlags?.transformation?.shapeId;
                  if (!shapeId || !item.shapes.has(shapeId)) {
                    notify(
                      NotificationType.Error,
                      `${localize('shape')} ${localize('missing')}`,
                    );
                    item.cancelTransformation();
                  } else item.swapShape(shapeId);
                },
              },
              {
                label: localize('cancel'),
                callback: () => item.cancelTransformation(),
              },
            ]
          : [...item.shapes].map(([id, shape]) => ({
              label: shape.shapeName,
              callback: () => item.startShapeSwap(id),
            })),
      });
    }
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
          <span class="shape-change"
            ><mwc-icon-button
              class="toggle ${classMap({
                activated: !!item.transformTimer?.completed,
              })}"
              icon="transform"
              data-tooltip=${item.transformTimer
                ? `${item.transformTimer.label}. ${prettyMilliseconds(
                    item.transformTimer.remaining,
                    {
                      compact: false,
                    },
                  )} ${localize('remaining').toLocaleLowerCase()}`
                : `${localize('change')} ${localize('shape')}`}
              @mouseover=${tooltip.fromData}
              @focus=${tooltip.fromData}
              @click=${this.openShapeMenu}
              ?disabled=${!editable}
            ></mwc-icon-button>
            ${item.transformTimer
              ? html`
                  <mwc-circular-progress
                    class="change-progress"
                    progress=${item.transformTimer.progress / 100}
                    density="-1"
                  ></mwc-circular-progress>
                `
              : ''}
          </span>
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
