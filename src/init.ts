import { html, render } from 'lit-html';
import { compact, first } from 'remeda';
import type { RawEditorSettings } from 'tinymce';
import type { PartialDeep } from 'type-fest';
import { onChatMessageRender } from './chat/message-hooks';
import { combatSocketHandler } from './combat/combat-tracker';
import { CustomRollApp } from './combat/components/custom-roll-app/custom-roll-app';
import { EPOverlay } from './components/ep-overlay/ep-overlay';
import type { ToolTip } from './components/tooltip/tooltip';
import { SlWindow } from './components/window/window';
import { openWindow } from './components/window/window-controls';
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
import { notEmpty } from './utility/helpers';

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
  CONFIG.Actor.entityClass = ActorEP;
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet(EP.Name, ActorEPSheet, { makeDefault: true });

  CONFIG.Scene.entityClass = SceneEP;
  CONFIG.ChatMessage.entityClass = ChatMessageEP;
  CONFIG.ChatMessage.batchSize = 20;

  CONFIG.User.entityClass = UserEP;
  CONFIG.Item.entityClass = ItemEP;

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

  const { current } = gameSettings.systemMigrationVersion;
  if (current < game.system.data.version && game.user.isGM) {
    await migrateWorld();
    gameSettings.systemMigrationVersion.update(game.system.data.version);
  }

  document.getElementById('board')?.addEventListener('auxclick', (ev) => {
    if (ev.button === 1) {
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
              } else if (tool.button) {
                if (tool.onClick instanceof Function) tool.onClick();
              } else {
                control.activeTool = tool.name;
                if (tool.onClick instanceof Function) tool.onClick();
              }

              ui.controls.render();
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

      for (const item of findActor(source)?.items || []) {
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
    document.body.classList.add('ready');
    Hooks.call('ep-ready', true);
    const frag = new DocumentFragment();
    render(
      html`
        <mwc-icon-button
          data-tooltip=${`${localize('custom')} ${localize('roll')}`}
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
      `,
      frag,
    );
    document.getElementById('chat-controls')?.prepend(frag);
  }, 150);

  const compendiumSearchButton = () => {
    const frag = new DocumentFragment();
    render(
      html`
        <mwc-button
          style="width: 100%"
          label=${localize('search')}
          icon="search"
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
      if (actor.isToken) actor.token?.drawBars();
      else actor.getActiveTokens(true).forEach((t) => t.drawBars());
    },
  });

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
    callback: (scene, tokenData, change) => {
      const changes = change as PartialDeep<TokenData>;
      if ('actorLink' in changes && changes.actorLink === false) {
        const actor = game.actors.get(tokenData.actorId);
        if (actor?.sheet.isRendered) {
          console.log('rendered');
          actor.sheet.close();
          const token = findToken({
            tokenId: tokenData._id,
            actorId: tokenData.actorId,
            sceneId: scene._id,
          });
          if (token) {
            token.actor?.sheet.render(true, { token });
          }
        }
      }
    },
  });

  mutatePlaceableHook({
    entity: Token,
    hook: 'on',
    event: MutateEvent.Delete,
    callback: (scene, tokenData) => {
      if (tokenData.actorLink) {
        const actor = game.actors.get(tokenData.actorId);
        if (
          actor?.sheet.isRendered &&
          actor.sheet._token?.id === tokenData._id
        ) {
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
      target.matches(`.entity.actor, .entity.item`) &&
      target.querySelector<HTMLElement>('.entity-name')?.click()
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
      const closestItem = lastClicked?.closest<HTMLElement>('.entity');
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
    target.matches('.entity.actor, .entity.item') &&
    target.click(),
);

const isItem = (entity: ItemEP | ActorEP): entity is ItemEP => {
  return (entity as ActorEP)._prepareOwnedItems === undefined;
};

for (const app of [ActorDirectory, ItemDirectory]) {
  applicationHook({
    app,
    hook: 'on',
    event: 'render',
    callback: (_, [list]) =>
      list?.querySelectorAll<HTMLLIElement>('.entity').forEach((listItem) => {
        const { entityId } = listItem.dataset;
        listItem.tabIndex = 0;
        const entity =
          entityId &&
          game[app === ActorDirectory ? 'actors' : 'items'].get(entityId);
        if (!entity) return;

        const nameElement = listItem.querySelector<HTMLHeadingElement>(
          'h4.entity-name',
        )!;

        if (isItem(entity)) {
          nameElement.querySelector('a')!.textContent = entity.proxy.fullName;
          nameElement.dataset['type'] = entity.proxy.fullType;
        } else {
          if (entity.type !== ActorType.Character && isSleeve(entity.proxy)) {
            nameElement.dataset['type'] = formattedSleeveInfo(entity.proxy)
              .concat(localize(entity.type))
              .join(' - ');
          } else {
            nameElement.dataset['type'] = localize(entity.type);
          }
        }
        listItem.title = `${entity.name}
        ${nameElement.dataset['type']}`;
      }),
  });
}
