import { SlWindow } from '@src/components/window/window';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import {
  ResizeOption,
  SlWindowEventName,
} from '@src/components/window/window-options';
import type { EntitySheet } from '@src/foundry/foundry-cont';
import { MutateEvent, mutatePlaceableHook } from '@src/foundry/hook-setups';
import { localize } from '@src/foundry/localization';
import { importFromCompendium, userCan } from '@src/foundry/misc-helpers';
import { readyCanvas } from '@src/foundry/canvas';
import { debounce } from '@src/utility/decorators';
import { assignStyles } from '@src/utility/dom';
import { html } from 'lit-html';
import { compact } from 'remeda';
import type { DeepPartial } from 'utility-types';
import { ActorType } from '../entity-types';
import type { ActorEP } from './actor';
import { renderCharacterView, renderSleeveForm } from './actor-views';
import type { Subscription } from 'rxjs';
import { subscribeToToken } from '../token-subscription';

export const actorSheets = new WeakMap<ActorEP, ActorEPSheet>();

export class ActorEPSheet implements EntitySheet {
  private _token?: Token | null;
  declare token: unknown | null;
  private actorUnsub?: (() => void) | null;

  private window: SlWindow | null = null;

  private tokenSubscription?: Subscription | null;

  constructor(private actor: ActorEP) {
    actorSheets.set(actor, this);
    if (actor.isToken && actor.token?.scene) {
      this.tokenSubscription = subscribeToToken(
        { tokenId: actor.token.id, sceneId: actor.token.scene.id },
        {
          next: (token) => {
            // console.log(token);
            this._token = token;
            if (token.actor) {
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
  }

  private get windowKey() {
    return this;
  }

  // private checkToken = () => {
  //   if (this._token && this.actor.isToken) {
  //     if (this._token.scene?.id !== readyCanvas()?.scene.id) {
  //       this.actor.subscriptions.unsubscribeAll();
  //       this.close();
  //     }
  //   }
  // };

  get rendered() {
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
    const { compendium, id } = this.actor;
    return compact([
      SlWindow.headerButton({
        onClick: this.configureToken,
        disabled: !(this.actor.owner && userCan('TOKEN_CONFIGURE')),
        content: html`
          <i class="fas fa-user-circle"></i> ${this._token
            ? 'Token'
            : 'Prototype Token'}
        `,
      }),
      compendium &&
        SlWindow.headerButton({
          onClick: () => importFromCompendium(compendium, id),
          content: html`<i class="fas fa-download"></i>`,
          disabled: !userCan('ACTOR_CREATE'),
        }),
    ]);
  }

  private get actorToken() {
    return this._token || this.actor.token;
  }

  private configureToken = (ev: Event) => {
    if (ev.currentTarget instanceof HTMLElement) {
      const { top, left } = ev.currentTarget.getBoundingClientRect();
      new TokenConfig(this.actorToken || new Token(this.actor.data.token), {
        left,
        top: top + 10,
        configureDefault: !this.actorToken,
      }).render(true);
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
        adjacentEl: !this.rendered && this.getAdjacentEl(),
      },
      { resizable: ResizeOption.Both },
    );
    if (!wasConnected) {
      win.addEventListener(SlWindowEventName.Closed, () => this.close(), {
        once: true,
      });
      // TODO listen to token change
    }
    this.window = win;
  }

  getAdjacentEl() {
    const { actor } = this;
    const token = this._token || this.actor.token;
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
        `[data-entity-id="${actor.id}"], [data-entry-id="${actor.id}"]`,
      ),
    )
      .reverse()
      .find((el) => !!el.offsetParent);
  }

  render(force: boolean, { token }: { token?: Token | null } = {}) {
    if (!force && !this.rendered) return this;

    if (force) {
      this._token = token;
      // token ||
      // (this.actor.token &&
      //   readyCanvas()?.tokens.get(this.actor.token.data._id));
    }

    this.openWindow(force);
    return this;
  }

  maximize() {
    // TODO don't pass token if opened from sidebar-list
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
    // Hooks.off('canvasReady', this.checkToken);
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
