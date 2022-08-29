import { SlWindow } from '@src/components/window/window';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import { readyCanvas } from '@src/foundry/canvas';
import type { EntitySheet } from '@src/foundry/foundry-cont';
import { localize } from '@src/foundry/localization';
import { userCan } from '@src/foundry/misc-helpers';
import { EP } from '@src/foundry/system';
import { openMenu } from '@src/open-menu';
import { debounce } from '@src/utility/decorators';
import { assignStyles } from '@src/utility/dom';
import { html } from 'lit-html';
import { compact, noop } from 'remeda';
import type { Subscription } from 'rxjs';
import type { DeepPartial } from 'utility-types';
import { ActorType } from '../entity-types';
import { subscribeToToken } from '../token-subscription';
import type { ActorEP } from './actor';
import { renderCharacterView, renderSleeveForm } from './actor-views';

export const actorSheets = new WeakMap<ActorEP, ActorEPSheet>();

export class ActorEPSheet implements EntitySheet {
  _token?: TokenDocument | null; // TODO this is actually TokenDoc
  declare token: unknown | null;
  private actorUnsub?: (() => void) | null;

  private window: SlWindow | null = null;

  private tokenSubscription?: Subscription | null;

  private disableTokenConfig = false;

  private canvasReadyCallback = () => {
    const disableTokenConfig = !!(
      this._token && this._token.parent !== readyCanvas()?.scene
    );
    if (disableTokenConfig !== this.disableTokenConfig) {
      this.disableTokenConfig = disableTokenConfig;
      this.isRendered && this.render(true, { token: this._token });
    }
  };

  constructor(private actor: ActorEP) {
    actorSheets.set(actor, this);
    if (actor.isToken && actor.token?.parent) {
      this.tokenSubscription = subscribeToToken(
        { tokenId: actor.token.id, sceneId: actor.token.parent.id },
        {
          next: (token) => {
            this._token = token;
            if (token.data.actorLink) {
              this.close();
              token.actor?.sheet.render(true, { token });
            } else if (token.actor) {
              const actorChange = this.actor !== token.actor;
              if (actorChange) {
                actorSheets.delete(this.actor);
                actorSheets.set(token.actor, this);
              }
              this.actor = token.actor;
              this.render(actorChange, { token });
            } else this.close();
          },
          complete: () => this.close(),
        },
      );
    } else {
      this.actorUnsub = actor.subscribe((act) => {
        if (!act) this.close();
        else this.render(false);
      });
    }
    Hooks.on('canvasReady', this.canvasReadyCallback);
  }

  private get windowKey() {
    return this;
  }

  get isRendered() {
    return !!this.window?.isConnected;
  }

  get _minimized() {
    return !!this.window?.minimized;
  }

  get content() {
    const { proxy: agent } = this.actor;
    return agent.type === ActorType.Character
      ? renderCharacterView(agent, this._token)
      : renderSleeveForm(agent);
  }

  bringToTop() {
    this.openWindow(true);
  }

  private get windowHeaderButtons() {
    const { compendium, id, proxy } = this.actor;
    const linked = this._token?.data.actorLink ?? this.actor.token?.actorLink;

    return compact([
      SlWindow.headerButton({
        // onClick: () => {
        //   this._token
        //     ? this._token.update({ actorLink: !linked }, {})
        //     : this.actor.updater.path('token', 'actorLink').commit(!linked);
        // },
        onClick: noop,
        // disabled: !(this.actor.owner && userCan('TOKEN_CONFIGURE')),
        disabled: true,
        content: html`<mwc-icon>${linked ? 'link' : 'link_off'}</mwc-icon>`,
      }),
      SlWindow.headerButton({
        onClick: this.configureToken,
        disabled:
          this.disableTokenConfig ||
          !(this.actor.isOwner && userCan('TOKEN_CONFIGURE')),
        content: html`
          <i class="fas fa-user-circle"></i> ${this._token
            ? 'Token'
            : 'Prototype Token'}
        `,
      }),

      compendium &&
        SlWindow.headerButton({
          onClick: async () => {
            await this.close();
            this.actor.collection?.importFromCompendium(
              compendium,
              this.actor.id,
              {},
              { renderSheet: true },
            );
          },
          content: html`<i class="fas fa-download"></i>`,
          disabled: !userCan('ACTOR_CREATE'),
        }),
      proxy.type === ActorType.Character &&
        SlWindow.headerButton({
          onClick: this.openSettingsMenu,
          content: html`<mwc-icon>settings</mwc-icon>`,
          disabled: !this.actor.editable,
        }),
    ]);
  }

  private openSettingsMenu = () => {
    const { proxy } = this.actor;
    if (proxy.type !== ActorType.Character) return;
    const compact = !!proxy.epFlags?.compactSheet;
    openMenu({
      header: { heading: localize('settings') },
      content: [
        html`<mwc-check-list-item
          ?selected=${compact}
          @click=${() =>
            proxy.updater
              .path('flags', EP.Name, 'compactSheet')
              .commit(!compact)}
          >${localize('compact')}</mwc-check-list-item
        >`,
      ],
    });
  };

  private configureToken = (ev: Event) => {
    if (ev.currentTarget instanceof HTMLElement) {
      const { top, left } = ev.currentTarget.getBoundingClientRect();
      new TokenConfig(this._token ?? this.actor, {
        left,
        top: top + 10,
      }).render(true, {});
    }
  };

  @debounce(1)
  private openWindow(force: boolean) {
    const { name: actorName } = this.actor;
    const { name: tokenName } = this._token ?? {};
    const { win, wasConnected } = openWindow(
      {
        key: this.windowKey,
        content: html` ${this.windowHeaderButtons} ${this.content} `,
        name:
          actorName !== tokenName
            ? `${actorName} ${
                tokenName ? `- ${localize('token')}: ${tokenName}` : ''
              }`
            : actorName,
        img: this._token?.data.img || this.actor.img,
        forceFocus: force,
        adjacentEl: !this.isRendered && this.getAdjacentEl(),
      },
      { resizable: ResizeOption.Both },
    );
    if (!wasConnected) {
      win.addEventListener(SlWindowEventName.Closed, () => this.close(), {
        once: true,
      });
    }
    this.window = win;
  }

  getAdjacentEl() {
    const { actor } = this;
    const token = (this._token ?? this.actor.token)?.object;
    if (token?.scene?.isView && token?.isVisible) {
      const hud = document.getElementById('hud');
      if (hud) {
        const { w, h, x, y, data } = token;
        const { scale } = data;
        const div = document.createElement('div');
        hud.append(
          assignStyles(div, {
            position: 'absolute',
            width: `${w}px`,
            height: `${h}px`,
            left: `${x}px`,
            top: `${y}px`,
            borderRadius: '2px',
            transform: `scale(${scale})`,
          }),
        );
        setTimeout(() => div.remove(), 1000);
        return div;
      }
    }
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        `[data-document-id="${actor.id}"], [data-entry-id="${actor.id}"]`,
      ),
    )
      .reverse()
      .find((el) => !!el.offsetParent);
  }

  render(force: boolean, { token }: { token?: TokenDocument | null } = {}) {
    if (!force && !this.isRendered) return this;

    if (force) {
      this._token = token;
    }

    this.openWindow(force);
    return this;
  }

  maximize() {
    if (this._minimized) this.render(true, { token: this._token });
    return this;
  }

  async close() {
    this.actorUnsub?.();
    this.actorUnsub = null;
    this.token = null;
    this.tokenSubscription?.unsubscribe();
    actorSheets.delete(this.actor);
    closeWindow(this.windowKey);
    Hooks.off('canvasReady', this.canvasReadyCallback);
    this.window = null;
    return this;
  }

  async submit({
    updateData,
    _id,
  }: {
    updateData: DeepPartial<ActorEP['data']>;
    _id: string;
  }) {
    return this.actor.update({ ...updateData, _id });
  }
}
