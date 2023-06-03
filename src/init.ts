import { html, render } from 'lit-html';
import { compact, first } from 'remeda';
import type { RawEditorSettings } from 'tinymce';
import type { PartialDeep } from 'type-fest';
import { createMessage, rollModeToVisibility } from './chat/create-message';
import { onChatMessageRender } from './chat/message-hooks';
import { combatSocketHandler } from './combat/combat-tracker';
import { CombatView } from './combat/components/combat-view/combat-view';
import { CustomRollApp } from './combat/components/custom-roll-app/custom-roll-app';
import { EPOverlay } from './components/ep-overlay/ep-overlay';
import { renderNumberField } from './components/field/fields';
import { renderAutoForm, renderSubmitForm } from './components/form/forms';
import type { Popover } from './components/popover/popover';
import { Placement } from './components/popover/popover-options';
import type { ToolTip } from './components/tooltip/tooltip';
import { SlWindow } from './components/window/window';
import { openWindow } from './components/window/window-controls';
import { ResizeOption } from './components/window/window-options';
import { enumValues } from './data-enums';
import { ActorEP } from './entities/actor/actor';
import { ActorEPSheet } from './entities/actor/actor-sheet';
import { formattedSleeveInfo, isSleeve } from './entities/actor/sleeves';
import { ChatMessageEP } from './entities/chat-message';
import { CompendiumSearch } from './entities/components/compendium-search/compendium-search';
import { ActorType } from './entities/entity-types';
import { findActor, findToken } from './entities/find-entities';
import { ItemEP } from './entities/item/item';
import { ItemEPSheet } from './entities/item/item-sheet';
import { migrateWorld } from './entities/migration';
import { foundry9to10Migration } from './entities/v9to10migration';
import type { ItemEntity } from './entities/models';
import { SceneEP } from './entities/scene';
import { UserEP } from './entities/user';
import { conditionIcons, ConditionType } from './features/conditions';
import { positionApp } from './foundry/foundry-apps';
import type { TokenData } from './foundry/foundry-cont';
import { registerEPSettings } from './foundry/game-settings';
import {
  applicationHook,
  mutateEntityHook,
  MutateEvent,
  mutatePlaceableHook,
} from './foundry/hook-setups';
import { localize } from './foundry/localization';
import { addEPSocketHandler, setupSystemSocket } from './foundry/socket';
import { EP } from './foundry/system';
import { openMenu } from './open-menu';
import { rollSuccessTest } from './success-test/success-test';
import { notEmpty } from './utility/helpers';
import { localImage } from './utility/images';
import { readyCanvas } from './foundry/canvas';

export let gameSettings: ReturnType<typeof registerEPSettings>;
export let overlay: EPOverlay;
export let tooltip: ToolTip;
export let lastEventPosition: DragEvent | MouseEvent | null = null;

const setLastPosition = (ev: DragEvent | MouseEvent) =>
  (lastEventPosition = ev);
window.addEventListener('mousedown', setLastPosition, { capture: true });
window.addEventListener('mouseup', setLastPosition, { capture: true });
window.addEventListener('click', setLastPosition, { capture: true });
window.addEventListener('drop', setLastPosition, { capture: true });

Hooks.once('init', () => {
  gameSettings = registerEPSettings();

  //@ts-expect-error
  foundry.documents.BaseItem.DEFAULT_ICON = localImage(
    'icons/nested-eclipses.svg',
  );
  CONFIG.Actor.documentClass = ActorEP;
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet(EP.Name, ActorEPSheet, { makeDefault: true });

  CONFIG.Scene.documentClass = SceneEP;
  CONFIG.ChatMessage.documentClass = ChatMessageEP;
  CONFIG.ChatMessage.batchSize = 20;

  CONFIG.User.documentClass = UserEP;
  CONFIG.Item.documentClass = ItemEP;

  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet(EP.Name, ItemEPSheet, { makeDefault: true });
  CONFIG.TinyMCE.content_css.push(`${EP.Path}/darkMCE.css`);
  (CONFIG.TinyMCE as RawEditorSettings).skin = 'oxide-dark';
  CONFIG.Combat.initiative.decimals = 2;
  CONFIG.statusEffects = compact([
    CONFIG.statusEffects[0],
    ...enumValues(ConditionType).map((condition) => ({
      icon: conditionIcons[condition],
      id: condition as string,
      label: `${EP.LocalizationNamespace}.${condition}`,
    })),
  ]);

  addEPSocketHandler('mutateCombat', combatSocketHandler);
});

Hooks.on('renderChatMessage', onChatMessageRender);

Hooks.once('ready', async () => {
  setupSystemSocket();

  if (game.user.isGM) {
    await foundry9to10Migration();
    const { current } = gameSettings.systemMigrationVersion;

    if (foundry.utils.isNewerVersion(game.system.version, current)) {
      await migrateWorld();
      gameSettings.systemMigrationVersion.update(game.system.version);
    }
  }

  document.getElementById('board')?.addEventListener('mousedown', (ev) => {
    if (ev.button === 1) {
      ev.preventDefault();
      const control = ui.controls.control as {
        name: string;
        title: string;
        layer: string;
        activeTool: string;
        tools: {
          name: string;
          icon: string;
          title: string;
          toggle?: boolean;
          button?: boolean;
          active?: boolean;
          onClick?: (args?: unknown) => void;
        }[];
      } | null;
      if (control && notEmpty(control.tools)) {
        openMenu({
          header: { heading: game.i18n.localize(control.title) },
          content: control.tools.map((tool) => ({
            label: game.i18n.localize(tool.title),
            icon: html`<i class=${tool.icon}></i>`,
            activated: ui.controls.activeTool === tool.name || !!tool.active,
            callback: () => {
              if (tool.toggle) {
                tool.active = !tool.active;
                if (tool.onClick instanceof Function) tool.onClick(tool.active);
                ui.controls.render();
              }

              // Handle Buttons
              else if (tool.button) {
                if (tool.onClick instanceof Function) tool.onClick();
                ui.controls.render();
              }

              // Handle Tools
              else {
                ui.controls.initialize({ tool: tool.name } as any);
              }
            },
          })),
          position: ev,
        });
      }
    }
  });

  addEPSocketHandler(
    'itemChange',
    ({ type, itemIds, ...source }, id, local) => {
      if (local || type !== 'update') return;

      for (const item of findActor(source)?.items.values() || []) {
        if (itemIds.includes(item.id)) item.invalidate();
      }
    },
  );

  setTimeout(() => {
    overlay = new EPOverlay();
    SlWindow.container = overlay;
    document.body.append(overlay);

    tooltip = document.createElement('sl-tooltip');
    tooltip.slot = 'tooltip';
    overlay.append(tooltip);
    // document.body.append(tooltip);
    document.body.classList.add('ready');
    Hooks.call('ep-ready', true);
    // const sceneView = document.createElement('scene-view');
    // document
    //   .getElementById('ui-left')
    //   ?.insertBefore(sceneView, document.getElementById('controls'));

    const extraInfo = document.createElement('div');
    extraInfo.className = 'ep-extra-info';
    extraInfo.append(document.createElement('scene-view'));
    extraInfo.append(document.createElement('world-time-controls'));

    document
      .getElementById('ui-top')
      ?.insertBefore(extraInfo, document.getElementById('loading'));

    function toggleChatPointers({ type }: MouseEvent) {
      document.getElementById('chat-log')!.style.pointerEvents =
        type === 'mouseenter' ? 'initial' : '';
    }

    const rightUI = document.getElementById('ui-right');
    rightUI?.addEventListener('mouseenter', toggleChatPointers);
    rightUI?.addEventListener('mouseleave', toggleChatPointers);

    const frag = new DocumentFragment();

    render(
      html`
        <mwc-icon-button
          data-ep-tooltip=${`${localize('custom')} ${localize('roll')}`}
          @mouseover=${tooltip.fromData}
          style="flex: 0; margin-right: 0.5rem; --mdc-icon-button-size: 1.5rem"
          @click=${(ev: Event & { currentTarget: HTMLElement }) =>
            openWindow({
              key: CustomRollApp,
              content: html`<custom-roll-app></custom-roll-app>`,
              name: `${localize('custom')} ${localize('roll')}`,
              adjacentEl: ev.currentTarget,
            })}
        >
          <img class="noborder" src="icons/svg/combat.svg" />
        </mwc-icon-button>
        <sl-popover
          placement=${Placement.Left}
          style="flex: 0; margin-right: 0.5rem;"
          focusSelector="input"
          .renderOnDemand=${(popover: Popover) => {
            return html`<sl-popover-section>
              ${renderSubmitForm({
                noDebounce: true,
                submitButtonText: 'Roll Success Test',
                submitEmpty: true,
                props: { target: 50 },
                update: (changed) => {
                  const { target = 50 } = changed;
                  createMessage({
                    data: {
                      successTest: {
                        disableSuperiorEffects: true,
                        parts: [{ name: 'Base', value: target }],
                        states: [
                          {
                            ...rollSuccessTest({ target }),
                            action: 'initial',
                          },
                        ],
                      },
                    },
                    visibility: rollModeToVisibility(
                      game.settings.get('core', 'rollMode'),
                    ),
                  });
                  popover.open = false;
                },
                fields: ({ target }) =>
                  renderNumberField(target, { min: 0, max: 99 }),
              })}
            </sl-popover-section>`;
          }}
        >
          <mwc-icon-button
            slot="base"
            data-ep-tooltip="Quick Success Test"
            @mouseover=${tooltip.fromData}
            @contextmenu=${() => {
              new Roll('1d100 - 1').toMessage();
            }}
            style="--mdc-icon-button-size: 1.5rem;"
          >
            <span style="font-weight: bold; font-size: 1rem">%</span>
          </mwc-icon-button>
        </sl-popover>
      `,
      frag,
    );
    const chatControls = document.getElementById('chat-controls');
    if (!chatControls) {
      Hooks.once('renderChatLog', (log: unknown, [el]: JQuery) => {
        el?.querySelector('#chat-controls')?.prepend(frag);
      });
    } else chatControls.prepend(frag);
  }, 150);

  const compendiumSearchButton = () => {
    const frag = new DocumentFragment();
    render(
      html`
        <mwc-button
          style="width: calc(100% - 0.5rem); margin: 0.25rem; line-height: 1;"
          label=${localize('search')}
          icon="search"
          raised
          @click=${() => {
            openWindow({
              key: CompendiumSearch,
              name: localize('search'),
              content: html` <compendium-search></compendium-search> `,
            });
          }}
        ></mwc-button>
      `,
      frag,
    );
    return frag;
  };

  const trackerAnchor = document.querySelector(
    "#sidebar-tabs > a.item[data-tab='combat']",
  );

  trackerAnchor?.addEventListener('contextmenu', (ev) => {
    ev.stopPropagation();
    ev.preventDefault();
    openWindow(
      {
        key: CombatView,
        content: html`<combat-view></combat-view>`,
        name: localize('combat'),
      },
      { resizable: ResizeOption.Both },
    );
  });

  document
    .querySelector('#compendium .directory-footer')
    ?.append(compendiumSearchButton());

  applicationHook({
    app: CompendiumDirectory,
    hook: 'on',
    event: 'render',
    callback: (dir, [el]) => {
      el?.querySelector('.directory-footer')?.append(compendiumSearchButton());
    },
  });

  applicationHook({
    app: ChatLog,
    hook: 'on',
    event: 'render',
    callback: (log) => {
      if (log.popOut) {
        requestAnimationFrame(() => {
          log.setPosition();
        });
      }
    },
  });

  // applicationHook({
  //   app: HeadsUpDisplay,
  //   hook: "on",
  //   event: "render",
  //   callback: (_, [el]) => {
  //     const tokenQuickView = new TokenQuickView();
  //     el.append(tokenQuickView);
  //     activeCanvas()?.tokens.placeables.forEach((t) => t.drawBars());
  //   },
  // });

  mutateEntityHook({
    entity: ActorEP,
    hook: 'on',
    event: MutateEvent.Update,
    callback: (actor) => {
      if (actor.isToken) {
        actor.token?.object?.drawEffects();
      } else {
        actor
          .getActiveTokens(true, false)
          .forEach((t) => (t as Token).drawEffects());
      }

      if (!actor.token && !actor.compendium) {
        const sidebarListItem = document.querySelector(
          `.sidebar-tab.directory .directory-item.actor[data-document-id="${actor.id}"]`,
        );
        if (sidebarListItem instanceof HTMLElement) {
          applyFullActorItemInfo(actor, sidebarListItem);
        }
      }
    },
  });

  // mutateEntityHook({
  //   entity: ItemEP,
  //   hook: 'on',
  //   event: MutateEvent.PreCreate,
  //   callback: (item, data) => {
  //     if (data && typeof data === 'object' && 'img' in data) {
  //       const { img } = data as { img?: string };
  //       console.log(img);
  //       if (img === 'icons/svg/item-bag.svg' || img === CONST.DEFAULT_TOKEN) {
  //         (data as { img?: string }).img = foundry.data.ItemData.DEFAULT_ICON;
  //         console.log(data);
  //       }
  //     }
  //   },
  // });

  // document.getElementById("board")?.addEventListener("drop", () => {
  //   const { element } = dragSource();
  //   if (element instanceof HotbarCell) element.requestDeletion();
  // });

  applicationHook({
    app: ChatPopout,
    hook: 'on',
    event: 'render',
    callback: (popout) => {
      requestAnimationFrame(() => popout.setPosition());
    },
  });

  mutatePlaceableHook({
    entity: Token,
    hook: 'on',
    event: MutateEvent.Update,
    callback: (tokenDoc, change) => {
      const changes = change as PartialDeep<TokenData>;
      if ('actorLink' in changes && changes.actorLink === false) {
        const actorId = tokenDoc.actorId;
        const actor = game.actors.get(actorId);
        if (actor?.sheet.isRendered) {
          actor.sheet.close();
          tokenDoc.actor?.sheet.render(true, { token: tokenDoc });
        }
      }
    },
  });

  mutatePlaceableHook({
    entity: Token,
    hook: 'on',
    event: MutateEvent.Delete,
    callback: (tokenDoc) => {
      if (tokenDoc.actorLink) {
        const actor = game.actors.get(tokenDoc.actorId);
        if (actor?.sheet.isRendered && actor.sheet._token?.id === tokenDoc.id) {
          actor.sheet.render(true);
        }
      }
    },
  });
});

let lastClicked: HTMLElement | null = null;

window.addEventListener(
  'click',
  (ev) => {
    const { target } = ev;
    const origTarget = first(ev.composedPath()) || target;
    lastClicked = origTarget instanceof HTMLElement ? origTarget : null;
    return (
      target instanceof HTMLLIElement &&
      target.matches(`.document.actor, .document.item`) &&
      target.querySelector<HTMLElement>('.document-name')?.click()
    );
  },
  { capture: true },
);

for (const app of [Dialog, PermissionControl, FolderConfig, FilePicker]) {
  applicationHook({
    app,
    hook: 'on',
    event: 'render',
    callback: (dialog) => {
      const closestItem = lastClicked?.closest<HTMLElement>('.document');
      const relative = closestItem || lastClicked;
      if (relative?.isConnected) positionApp(dialog, relative);
    },
  });
}

window.addEventListener(
  'keydown',
  ({ key, target }) =>
    key === 'Enter' &&
    target instanceof HTMLLIElement &&
    target.matches('.document.actor, .document.item') &&
    target.click(),
);

const isItem = (entity: ItemEP | ActorEP): entity is ItemEP => {
  return (entity as ActorEP).itemOperations === undefined;
};

applicationHook({
  app: Compendium,
  hook: 'on',
  event: 'render',
  callback: async (compendium, [el]) => {
    if (compendium.collection.documentName === 'Item') {
      await compendium.collection.getDocuments();
      for (const listItem of (el?.querySelectorAll('li.directory-item.item') ??
        []) as HTMLLIElement[]) {
        if (listItem.offsetParent) {
          const doc: ItemEP = await compendium.collection.getDocument(
            listItem.getAttribute('data-document-id'),
          );

          listItem
            .querySelector('.document-name')
            ?.setAttribute('data-type', doc.proxy.fullType);
        }
      }
    } else if (compendium.collection.documentName === 'Actor') {
      await compendium.collection.getDocuments();
      for (const listItem of (el?.querySelectorAll('li.directory-item.actor') ??
        []) as HTMLLIElement[]) {
        if (listItem.offsetParent) {
          const doc: ActorEP = await compendium.collection.getDocument(
            listItem.getAttribute('data-document-id'),
          );

          const type = localize(doc.type);
          listItem
            .querySelector('.document-name')
            ?.setAttribute(
              'data-type',
              isSleeve(doc.proxy)
                ? formattedSleeveInfo(doc.proxy).concat(type).join(' - ')
                : type,
            );
        }
      }
    }
  },
});

for (const app of [ActorDirectory, ItemDirectory]) {
  applicationHook({
    app,
    hook: 'on',
    event: 'render',
    callback: (_, [list]) =>
      list?.querySelectorAll<HTMLLIElement>('.document').forEach((listItem) => {
        const { documentId } = listItem.dataset;
        listItem.tabIndex = 0;
        const doc =
          documentId &&
          game[app === ActorDirectory ? 'actors' : 'items'].get(documentId);
        if (!doc) return;

        if (isItem(doc)) {
          applyFullItemInfo(doc, listItem);
        } else {
          applyFullActorItemInfo(doc, listItem);
        }
      }),
  });
}

function applyFullActorItemInfo(actor: ActorEP, listItem: HTMLElement) {
  const nameElement =
    listItem.querySelector<HTMLHeadingElement>('h4.document-name')!;
  if (actor.type !== ActorType.Character && isSleeve(actor.proxy)) {
    nameElement.dataset['type'] = formattedSleeveInfo(actor.proxy)
      .concat(localize(actor.type))
      .join(' - ');
  } else {
    nameElement.dataset['type'] = localize(actor.type);
  }
  listItem.title = `${actor.name}
        ${nameElement.dataset['type']}`;
}

function applyFullItemInfo(item: ItemEP, listItem: HTMLElement) {
  const nameElement =
    listItem.querySelector<HTMLHeadingElement>('h4.document-name')!;
  nameElement.querySelector('a')!.textContent = item.proxy.fullName;
  nameElement.dataset['type'] = item.proxy.fullType;
  listItem.title = `${item.name}
        ${nameElement.dataset['type']}`;
}

mutateEntityHook({
  entity: ItemEP,
  hook: 'on',
  event: MutateEvent.Update,
  callback: (item) => {
    if (!item.actor && !item.compendium) {
      const sidebarListItem = document.querySelector(
        `.sidebar-tab.directory .directory-item.item[data-document-id="${item.id}"]`,
      );
      if (sidebarListItem instanceof HTMLElement) {
        applyFullItemInfo(item, sidebarListItem);
      }
    }
  },
});
