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
import {
  activeCanvas,
  importFromCompendium,
  userCan,
} from '@src/foundry/misc-helpers';
import { debounce } from '@src/utility/decorators';
import { assignStyles } from '@src/utility/dom';
import { html } from 'lit-html';
import { compact } from 'remeda';
import type { DeepPartial } from 'utility-types';
import { ActorType } from '../entity-types';
import type { ActorEP } from './actor';
import { renderCharacterView, renderSleeveForm } from './actor-views';

type Unsub = (() => void) | null;

export class ActorEPSheet implements EntitySheet {
  private _token?: Token | null;
  declare token: unknown | null;
  private unsub: Unsub;

  private window: SlWindow | null = null;

  constructor(private actor: ActorEP) {
    this.unsub = actor.subscriptions.subscribe(this, {
      onEntityUpdate: () => this.render(false),
      onSubEnd: () => this.close(),
    });
    Hooks.on('canvasReady', this.checkToken);
  }

  private get windowKey() {
    return this.actor.isToken && this.actor.token
      ? this.actor.token
      : this.actor;
  }

  private checkToken = () => {
    if (this._token && this.actor.isToken) {
      if (this._token.scene?.id !== activeCanvas()?.scene.id) {
        this.actor.subscriptions.unsubscribeAll();
        this.close();
      }
    }
  };

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
        forceFocus: force,
        adjacentEl: !this.rendered && this.getAdjacentEl(),
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
    const token = this._token || this.actor.token;
    if (token?.isVisible) {
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
    console.log('actor render');
    if (!force && !this.rendered) return this;

    if (force) {
      this._token =
        token ||
        (this.actor.token &&
          activeCanvas()?.tokens.get(this.actor.token.data._id));
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
    this.unsub?.();
    this.unsub = null;
    this.token = null;
    closeWindow(this.windowKey);
    Hooks.off('canvasReady', this.checkToken);
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
