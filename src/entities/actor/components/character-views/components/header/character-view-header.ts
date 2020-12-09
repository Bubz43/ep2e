import { UseWorldTime } from '@src/components/mixins/world-time-mixin';
import { Placement } from '@src/components/popover/popover-options';
import { RechargeType } from '@src/data-enums';
import type { MaybeToken } from '@src/entities/actor/actor';
import type { Character } from '@src/entities/actor/proxies/character';
import { closeImagePicker, openImagePicker } from '@src/foundry/foundry-apps';
import { localize } from '@src/foundry/localization';
import { tooltip } from '@src/init';
import { openMenu } from '@src/open-menu';
import { notEmpty } from '@src/utility/helpers';
import { localImage } from '@src/utility/images';
import {
  customElement,
  html,
  LitElement,
  property,
  TemplateResult,
} from 'lit-element';
import { classMap } from 'lit-html/directives/class-map';
import { ifDefined } from 'lit-html/directives/if-defined';
import mix from 'mix-with/lib';
import { compact, range } from 'remeda';
import {
  CharacterDrawerRenderer,
  CharacterDrawerRenderEvent,
} from '../../character-drawer-render-event';
import styles from './character-view-header.scss';

@customElement('character-view-header')
export class CharacterViewHeader extends mix(LitElement).with(UseWorldTime) {
  static get is() {
    return 'character-view-header' as const;
  }

  static styles = [styles];

  @property({ attribute: false }) character!: Character;

  @property({
    attribute: false,
    hasChanged(value, oldValue) {
      return !value || !oldValue || value === oldValue;
    },
  })
  token?: MaybeToken;

  disconnectedCallback() {
    closeImagePicker(this);
    super.disconnectedCallback();
  }

  private requestDrawerRender(ev: Event) {
    const { renderer } = (ev.currentTarget as HTMLElement).dataset;
    this.dispatchEvent(
      new CharacterDrawerRenderEvent(renderer as CharacterDrawerRenderer),
    );
  }

  private updateFromChange() {
    this.requestUpdate();
  }

  private get img() {
    return this.token?.data.img || this.character.img;
  }

  private setImg = (img: string) => {
    if (this.token) this.token.update({ img }, {});
    else this.character.updater.prop('img').commit(img);
  };

  private editImg() {
    openImagePicker(this, this.img, this.setImg);
  }

  private imgSelect = () =>
    html`
      <mwc-list class="images">
        ${compact([this.character, this.character.sleeve]).map((entity) => {
          return html`
            <mwc-list-item
              graphic="medium"
              @click=${() => this.setImg(entity.img)}
            >
              <img src=${entity.img} slot="graphic" />
              <span>${entity.name}</span>
            </mwc-list-item>
          `;
        })}
        <li divider></li>
        <mwc-list-item
          graphic="medium"
          @click=${this.editImg}
          style="height: 40px"
        >
          <mwc-icon slot="graphic">insert_photo</mwc-icon>
          <span>${localize('browse')}</span>
        </mwc-list-item>
      </mwc-list>
    `;

  render() {
    const name = this.token?.data.name || this.character.name;

    return html`
      <sl-popover class="image-wrapper" .renderOnDemand=${this.imgSelect}>
        <button slot="base" ?disabled=${this.character.disabled}>
          <img src=${this.img} />
        </button>
      </sl-popover>
      <h2>${name}</h2>
      <div class="actions">
        ${this.renderActionIconButton({
          icon: 'search',
          tooltipText: localize('search'),
          renderer: CharacterDrawerRenderer.Search,
        })}
        ${this.renderActionIconButton({
          icon: 'access_time',
          tooltipText: localize('time'),
          renderer: CharacterDrawerRenderer.Time,
          content: this.character.activeDurations
            ? html`
                <notification-coin
                  value=${this.character.activeDurations}
                  ?actionRequired=${this.character.requiresAttention}
                ></notification-coin>
              `
            : undefined,
        })}
        <!-- ${this.renderActionIconButton({
          icon: undefined,
          tooltipText: localize('armor'),
          renderer: CharacterDrawerRenderer.Armor,
          content: html`<img src=${localImage('icons/armor/shield.svg')} />`,
        })} -->
        ${this.renderActionIconButton({
          icon: 'groups',
          tooltipText: localize('resleeve'),
          renderer: CharacterDrawerRenderer.Resleeve,
        })}
        ${this.renderActionIconButton({
          icon: 'wifi',
          tooltipText: `${localize('network')} ${localize('settings')}`,
          renderer: CharacterDrawerRenderer.NetworkSettings,
        })}

        <mwc-button
          class="effects-toggle"
          dense
          label="${localize('effects')}: ${this.character.appliedEffects.total}"
          data-renderer=${CharacterDrawerRenderer.Effects}
          @click=${this.requestDrawerRender}
        ></mwc-button>

        ${this.character.poolHolder === this.character
          ? this.renderRecharges()
          : ''}
      </div>
      <sl-popover
        class="restore-popover"
        .closeEvents=${['trash-changed']}
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
    `;
  }

  private renderRecharges() {
    const { activeRecharge, timeTillRechargeComplete } = this.character;
    return html` <button
      class="recharges"
      ?disabled=${this.character.disabled}
      data-renderer=${CharacterDrawerRenderer.Recharge}
      @click=${this.requestDrawerRender}
      data-tooltip=${localize('recharge')}
      @mouseover=${tooltip.fromData}
      @focus=${tooltip.fromData}
    >
      ${Object.values(this.character.recharges).map(
        ({ type, taken, max }) => html`
          <div
            class="recharge ${classMap({
              active: activeRecharge?.rechargeType === type,
              ready: !timeTillRechargeComplete,
            })}"
          >
            <span class="recharge-type"
              >${localize(type === RechargeType.Short ? 'short' : 'long')}</span
            >
            ${range(0, max).map(
              (box) => html`
                <mwc-icon
                  >${taken > box
                    ? 'check_box'
                    : 'check_box_outline_blank'}</mwc-icon
                >
              `,
            )}
          </div>
        `,
      )}
    </button>`;
  }

  private renderActionIconButton({
    icon,
    tooltipText,
    renderer,
    content,
  }: {
    icon: string | undefined;
    tooltipText: string;
    renderer: CharacterDrawerRenderer;
    content?: TemplateResult;
  }) {
    return html` <mwc-icon-button
      ?disabled=${this.character.disabled}
      data-tooltip=${tooltipText}
      icon=${ifDefined(icon)}
      @mouseenter=${tooltip.fromData}
      @focus=${tooltip.fromData}
      data-renderer=${renderer}
      @click=${this.requestDrawerRender}
      >${content || ''}</mwc-icon-button
    >`;
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
