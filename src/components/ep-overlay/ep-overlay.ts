import { CombatView } from '@src/combat/components/combat-view/combat-view';
import type { Character } from '@src/entities/actor/proxies/character';
import { positionApp } from '@src/foundry/foundry-apps';
import { tooltip } from '@src/init';
import { RenderDialogEvent } from '@src/open-dialog';
import { resizeElement, toggleTouchAction } from '@src/utility/dom';
import { notEmpty } from '@src/utility/helpers';
import {
  customElement,
  html,
  LitElement,
  property,
  query,
  state
} from 'lit-element';
import { render, TemplateResult } from 'lit-html';
import { traverseActiveElements } from 'weightless';
import type { EventList } from '../event-list/event-list';
import { closeWindow } from '../window/window-controls';
import { SlWindowEventName } from '../window/window-options';
import styles from './ep-overlay.scss';

// const relevantHooks = [
//   'updateScene',
//   'deleteScene',
//   'updateToken',
//   'updateUser',
//   'targetToken',
//   'canvasReady',
//   'controlToken',
//   'createToken',
//   'updateActor',
//   'updateOwnedItem',
//   'deleteOwnedItem',
//   'createOwnedItem',
// ] as const;

type MainCharacter = { character: Character; token?: Token };

@customElement('ep-overlay')
export class EPOverlay extends LitElement {
  static get is() {
    return 'ep-overlay' as const;
  }

  static styles = [styles];

  @property({ type: Boolean, reflect: true }) ready = false;

  @property({ type: Boolean, reflect: true }) faded = false;

  @query("slot[name='app-controls']")
  private foundryViewControlBar!: HTMLSlotElement;

  // @query('slot[name="foundry-apps"]')
  // private foundryApps!: HTMLSlotElement;

  // @query('slot#windows')
  // private windowsSlot!: HTMLSlotElement;

  @query('event-list', true)
  eventList!: EventList;

  @state() private dialogTemplate: TemplateResult | null = null;

  firstUpdated() {
    document.body.addEventListener(RenderDialogEvent.is, async (ev) => {
      ev.stopPropagation();
      this.dialogTemplate = ev.dialogTemplate;
      const focusSource = traverseActiveElements();

      await this.updateComplete;
      requestAnimationFrame(() => {
        const dialog = this.renderRoot.querySelector('mwc-dialog');
        if (!dialog) this.dialogTemplate = null;
        else {
          if (!dialog.open) dialog.open = true;

          dialog.addEventListener(
            'closed',
            () => {
              if (
                focusSource?.isConnected &&
                focusSource instanceof HTMLElement
              ) {
                focusSource.focus();
              }
              this.dialogTemplate = null;
            },
            { once: true },
          );
        }
      });
    });
    // for (const event of ['render', 'close'] as const) {
    //   applicationHook({
    //     app: SidebarTab,
    //     hook: 'on',
    //     event,
    //     callback: this.toggleActiveFoundryApps,
    //   });
    // }

    setTimeout(() => {
      // this.setFoundryPopouts();
      // this.stealElements();
      ui.chat.scrollBottom();
      this.ready = true;
    }, 400);

    // window.addEventListener("resize", () => this.confirmPositions());
    // requestAnimationFrame(() => this.confirmPositions());
    // relevantHooks.forEach((hook) => Hooks.on(hook, this.setupControlled));
  }

  // private setupControlled = debounceFn(() => {
  //   const controlled = (readyCanvas()?.tokens.controlled || []).sort((a, b) => {
  //     const { x: aX, y: aY } = a._validPosition;
  //     const { x: bX, y: bY } = b._validPosition;

  //     return aY === bY ? aY - bY : aX - bX;
  //   });
  //   const tokens: Token[] = [];
  //   let mainCharacter: MainCharacter | null = null;
  //   for (const token of controlled) {
  //     const { actor } = token;
  //     if (!mainCharacter && actor?.proxy?.type === ActorType.Character) {
  //       mainCharacter = {
  //         character: actor.proxy,
  //         token,
  //       };
  //     } else {
  //       tokens.push(token);
  //     }
  //   }
  //   if (!mainCharacter) {
  //     const { character } = game.user;
  //     if (character?.proxy.type === ActorType.Character) {
  //       mainCharacter = {
  //         character: character.proxy,
  //         token: first(character.getActiveTokens(true)),
  //       };
  //     }
  //   }

  //   this.tokens = tokens;
  //   this.mainCharacter = mainCharacter;
  //   this.requestUpdate();
  // }, 1);

  stealElements() {
    const ids = [
      // 'chat',
      'sidebar',
      'navigation',
      'controls',
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) {
        const wrapper = document.createElement('div');
        wrapper.style.display = 'contents';
        wrapper.slot = id;
        wrapper.append(el);
        this.append(wrapper);
      }
    }
    this.setupChat();
  }

  private setupChat() {
    const chatTextArea = document.getElementById('chat-message');
    chatTextArea?.setAttribute('placeholder', 'Enter a message');
    chatTextArea?.addEventListener('keydown', () => {});
    // chatTextArea?.before(new CommandHelper());
    document
      .getElementById('chat-form')
      ?.addEventListener('pointerdown', (ev: PointerEvent) => {
        if (ev.currentTarget !== ev.target) return;
        const el = ev.currentTarget as HTMLElement;
        const { scrollTop, scrollHeight, offsetHeight } =
          document.getElementById('chat-log')!;
        const atBottom = scrollTop + offsetHeight === scrollHeight;
        const undo = toggleTouchAction(el);
        resizeElement({
          element: el,
          ev,
          width: false,
          height: true,
          reverse: true,
          onEnd: () => {
            undo();
            if (atBottom) ui.chat.scrollBottom();
          },
        });
      });
  }

  private get foundryViewControls() {
    return this.foundryViewControlBar.assignedElements() as HTMLElement[];
  }

  private toggleActiveFoundryApps = () => {
    for (const el of this.foundryViewControls) {
      const { view } = el.dataset;
      if (view === 'combat') continue;
      const app = ui[view as keyof typeof ui];
      el.classList.toggle(
        'active',
        !!(app instanceof SidebarTab && app._popout),
      );
    }
  };

  private setFoundryPopouts() {
    this.foundryViewControls.forEach((el) => el.remove());
    const sTabs = document.getElementById('sidebar-tabs');
    if (!sTabs) return;
    const sidebarTabs = Array.from(
      sTabs.querySelectorAll<HTMLElement>('a.item'),
    ).map((tabLink) => {
      const { title, dataset } = tabLink;
      const icon = tabLink.querySelector('i.fas');
      const tabName = dataset['tab'] as keyof typeof ui;
      if (tabName === 'chat') return '';
      const tabApp = ui[tabName];
      if (!(tabApp instanceof SidebarTab)) return '';

      return html`
        <wl-list-item
          slot="app-controls"
          clickable
          data-ep-tooltip=${title}
          @mouseenter=${tooltip.fromData}
          @focus=${tooltip.fromData}
          data-view=${tabName}
          @click=${(ev: Event & { currentTarget: HTMLElement }) => {
            const { currentTarget } = ev;
            if (tabName === 'combat') {
              const { win, wasConnected } = CombatView.openWindow();
              if (!wasConnected) {
                win.addEventListener(
                  SlWindowEventName.Closed,
                  () => currentTarget.classList.remove('active'),
                  { once: true },
                );
              }
              currentTarget.classList.add('active');
              return;
            }
            const { _popout } = tabApp;
            if (_popout && notEmpty(_popout.element)) {
              const [element] = _popout.element;
              if (element?.classList.contains('minimized')) _popout.maximize();
              _popout.bringToTop();
            } else {
              tabApp.renderPopout();
              requestAnimationFrame(async () => {
                const { _popout } = tabApp;
                if (currentTarget instanceof HTMLElement && _popout?.element) {
                  positionApp(_popout, currentTarget);
                }
              });
            }
          }}
          @contextmenu=${() => {
            if (tabName === 'combat') {
              closeWindow(CombatView);
            } else tabApp._popout?.close({});
          }}
          >${icon}</wl-list-item
        >
      `;
    });
    const fragment = new DocumentFragment();
    render(sidebarTabs, fragment);
    this.append(fragment);
    sTabs.remove();
  }

  // private switchWindowZ({ currentTarget }: Event) {
  //   if (!(currentTarget instanceof HTMLSlotElement)) return;
  //   if (!currentTarget.classList.contains('top')) {
  //     const otherSlot =
  //       currentTarget.id === 'windows' ? this.foundryApps : this.windowsSlot;
  //     currentTarget.classList.add('top');
  //     otherSlot.classList.remove('top');
  //   }
  // }

  render() {
    return html`
      <!-- <div class="singles">
        <world-time-controls></world-time-controls>
      </div> -->
      ${this.staticElements} ${this.dialogTemplate || ''}
    `;
  }

  private staticElements = html`
    <!-- <scene-view><slot name="navigation"></slot></scene-view> -->
    <!-- <slot
      name="foundry-apps"
    
    ></slot> -->
    <!-- <slot id="windows"></slot> -->
    <!-- <scene-view></scene-view> -->
    <!-- <div class="nav-wrapper">
      <mwc-icon-button-toggle
        onIcon="expand_more"
        offIcon="expand_less"
      ></mwc-icon-button-toggle>

      <slot name="navigation"></slot>
    </div>
    <div class="controls-wrapper">
      <slot name="controls"></slot>
    </div> -->
    <!-- <div
      class="sidebar-wrapper"
  
    >
      <slot name="sidebar"></slot>
    </div> -->

    <event-list></event-list>
    <slot name="dialog"></slot>
    <slot name="tooltip"></slot>
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'ep-overlay': EPOverlay;
  }
}
