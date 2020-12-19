import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import type { ActorEP } from '@src/entities/actor/actor';
import { ActorCreator } from '@src/entities/actor/components/actor-creator/actor-creator';
import { ActorType } from '@src/entities/entity-types';
import { ItemCreator } from '@src/entities/item/components/item-creator/item-creator';
import type { ItemDataEvent } from '@src/entities/item/components/item-creator/item-data-event';
import { ItemEP } from '@src/entities/item/item';
import type { SceneEP } from '@src/entities/scene';
import type { UserEP } from '@src/entities/user';
import { iconToCondition } from '@src/features/conditions';
import { openMenu } from '@src/open-menu';
import { findMatchingElement } from '@src/utility/dom';
import { notEmpty, searchRegExp } from '@src/utility/helpers';
import { html, render } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import { compact, first, mapToObj, noop, pipe } from 'remeda';
import { stopEvent } from 'weightless';
import { isKnownDrop, onlySetDragSource } from './drag-and-drop';
import { navMenuListener } from './foundry-apps';
import type { TokenData } from './foundry-cont';
import { localize } from './localization';
import { activeCanvas, convertMenuOptions } from './misc-helpers';
import { activeTokenStatusEffects } from './token-helpers';

Entity.prototype.matchRegexp = function (regex: RegExp) {
  return regex.test(this.name);
};

const { _injectHTML } = Application.prototype;
Application.prototype._injectHTML = function (html: JQuery, options: unknown) {
  if (this instanceof MainMenu) {
    _injectHTML.call(this, html, options);
    return;
  }
  const [el] = html;
  if (el) {
    el.slot = 'foundry-apps';
    document.querySelector('ep-overlay')?.append(el);
    this._element = html;
    html.hide().fadeIn(200);
  }
};

const { getData } = PlayerConfig.prototype;
PlayerConfig.prototype.getData = function () {
  const original = getData.call(this) as {
    user: User;
    actors: ActorEP[];
    options: unknown;
  };
  return {
    ...original,
    actors: original.actors.filter(
      (actor) => actor.proxy.type === ActorType.Character,
    ),
  };
};

// ActorDirectory.prototype._onCreateEntity = async function (ev: Event) {
//   stopEvent(ev);

//   if (ev.currentTarget instanceof HTMLElement) {
//     openWindow({
//       key: ActorCreator,
//       content: html` <actor-creator
//         folder=${ifDefined(ev.currentTarget.dataset.folder)}
//       ></actor-creator>`,
//       name: "Actor Creator",
//       adjacentEl: ev.currentTarget,
//     });
//   }
// };

// const itemCreate = ({ itemInit }: ItemDataEvent) => {
//   ItemEP.create(itemInit.data, itemInit.options);
//   closeWindow(ItemCreator);
// };

// ItemDirectory.prototype._onCreateEntity = async function (ev: Event) {
//   stopEvent(ev);

//   if (ev.currentTarget instanceof HTMLElement) {
//     openWindow({
//       key: ItemCreator,
//       content: html` <item-creator
//         @item-data=${itemCreate}
//         folder=${ifDefined(ev.currentTarget.dataset.folder)}
//       ></item-creator>`,
//       name: "Item Creator",
//       adjacentEl: ev.currentTarget,
//     });
//   }
// };

// Combat.prototype._getInitiativeFormula = ({ actor }: Combatant) =>
//   actor?.agent.type === ActorType.Character
//     ? `1d6 + ${actor.agent.initiative}`
//     : "0";

const { _onPreventDragstart } = Game.prototype;
Game.prototype._onPreventDragstart = function (ev: DragEvent) {
  return pipe(ev.composedPath(), first(), (target) => {
    return target instanceof Element &&
      target.getAttribute('draggable') === 'true'
      ? undefined
      : _onPreventDragstart.call(this, ev);
  });
};

const {
  drawEffects,
  toggleEffect,
  _onUpdateBarAttributes,
  _onUpdate,
} = Token.prototype;

Token.prototype._onUpdate = function (
  data: Partial<TokenData>,
  options: unknown,
  userId: string,
) {
  _onUpdate.call(this, data, options, userId);
  if ((data.overlayEffect || data.effects) && this.hasActiveHUD) {
    activeCanvas()?.tokens.hud.refreshStatusIcons();
  }
  this.actor?.render(false, {});
};

Token.prototype.drawEffects = async function () {
  if (!this.actor) return drawEffects.call(this);

  this.effects.removeChildren().forEach((c) => c.destroy());

  const effects = activeTokenStatusEffects(this);

  if (notEmpty(effects)) {
    const promises: Promise<unknown>[] = [];
    const width =
      Math.round(
        (canvas as ReturnType<typeof activeCanvas>)!.dimensions.size / 2 / 5,
      ) * 2;

    const background = this.effects
      .addChild(new PIXI.Graphics())
      .beginFill(0x000000, 0.4)
      .lineStyle(1.0, 0x000000);

    for (const [index, source] of effects.entries()) {
      promises.push(this._drawEffect(source, index, background, width, null));
    }
    await Promise.all(promises);
  }

  // Draw overlay effect
  if (this.data.overlayEffect) {
    const tex = await loadTexture(this.data.overlayEffect);
    const icon = new PIXI.Sprite(tex as any),
      size = Math.min(this.w * 0.6, this.h * 0.6);
    icon.width = icon.height = size;
    icon.position.set((this.w - size) / 2, (this.h - size) / 2);
    icon.alpha = 0.8;
    this.effects.addChild(icon);
  }
};
Token.prototype.toggleEffect = async function (
  effect: string | typeof CONFIG['statusEffects'][number] | null,
  options: { overlay?: boolean; active?: boolean } = {},
) {
  const texture =
    typeof effect === 'string'
      ? effect
      : effect?.icon ?? CONFIG.controlIcons.defeated;
  if (options.overlay)
    await this._toggleOverlayEffect(texture, { active: null });
  else {
    const condition = iconToCondition.get(texture);
    if (!condition || !this.actor) {
      const effects = new Set(this.data.effects);
      effects.has(texture) ? effects.delete(texture) : effects.add(texture);
      await this.update({ effects: [...effects] }, { diff: false });
    } else {
      const newConditions = new Set(this.actor.conditions);
      const active = !newConditions.delete(condition);
      await this.actor.proxy.updateConditions(
        active ? [...newConditions, condition] : [...newConditions],
      );
    }
  }

  if (this.hasActiveHUD) activeCanvas()?.tokens.hud.refreshStatusIcons();
  return this;
};

const conditionRegex = new RegExp('conditions', 'i');
const hasConditions = (path: string) => conditionRegex.test(path);
Token.prototype._onUpdateBarAttributes = function (updateData) {
  _onUpdateBarAttributes.call(this, updateData);
  if (Object.keys(flattenObject(updateData)).some(hasConditions)) {
    this.drawEffects();
    if (game.combat?.getCombatantByToken(this.data._id)) {
      game.combats.render(true);
    }
  }
};

TokenHUD.prototype._getStatusEffectChoices = function () {
  const token = this.object!;
  const effects = activeTokenStatusEffects(token);
  const statuses = new Map(
    [...(token.actor?.effects.values() ?? [])].flatMap((effect) => {
      const id = effect.getFlag('core', 'statusId');
      return typeof id === 'string' && id.length
        ? [[id, { id, overlay: !!effect.getFlag('core', 'overlay') }]]
        : [];
    }),
  );

  return mapToObj(CONFIG.statusEffects, ({ icon: src, id, label }) => {
    const status = statuses.get(id);
    const isActive = !!status?.id || effects.includes(src);
    const isOverlay = !!status?.overlay || token.data.overlayEffect === src;
    return [
      src,
      {
        id,
        src,
        title: game.i18n.localize(label) as string,
        isActive,
        isOverlay,
        cssClass: compact([isActive && 'active', isOverlay && 'overlay']).join(
          ' ',
        ),
      },
    ];
  });
};

const { _render } = ChatLog.prototype
ChatLog.prototype._render = async function (...args) {
  setTimeout(() => _render.call(this, ...args), 1500);
}

// Object.defineProperties(Token.prototype, {
//   w: {
//     enumerable: true,
//     get() {
//       return this.data.width * (activeCanvas()?.grid?.w || 1)
//     }
//   },
//   h: {
//     enumerable: true,
//     get() {
//       return this.data.height * (activeCanvas()?.grid?.h || 1)
//     }
//   }
// })



// TODO: Delay this to check for migration first
// const barCache = new WeakMap<PIXI.Graphics, number>();
// const bars = ["bar1", "bar2"] as const;
// Token.prototype.drawBars = function () {
//   const { actor } = this;
//   const canvas = activeCanvas();
//   if (
//     !actor ||
//     !this.bars ||
//     !canvas ||
//     this.data.displayBars === TOKEN_DISPLAY_MODES.NONE
//   ) {
//     return;
//   }

//   for (const barName of bars) {
//     const health =
//       barName === "bar1"
//         ? actor.agent.primaryHealth
//         : actor.agent.type === ActorType.Character &&
//           actor.agent.ego.mentalHealth;
//     const bar = this.bars[barName];
//     bar.visible = !!health;

//     if (!health) {
//       barCache.delete(bar);
//       continue;
//     }

//     const { durability: percent } = damagePercents(health.main);
//     if (barCache.get(bar) === percent) continue;
//     const height =
//       Math.max(canvas.dimensions.size / 12, 8) *
//       (this.data.height >= 2 ? 1.6 : 1);
//     const color =
//       barName === "bar2" ? [percent, 0, percent * 0.35] : [percent, 0, 0];
//     bar
//       .clear()
//       .beginFill(0x000000, 0.5)
//       .lineStyle(2, 0x000000, 0.9)
//       .drawRoundedRect(0, 0, this.w, height, 3)
//       .beginFill(PIXI.utils.rgb2hex(color), 0.8)
//       .lineStyle(1, 0x000000, 0.8)
//       .drawRoundedRect(1, 1, percent * (this.w - 2), height - 2, 2);
//     barCache.set(bar, percent);
//     bar.position.set(0, barName === "bar1" ? this.h - height : 0);
//   }
// };

const { defaultOptions } = JournalSheet;
Object.defineProperty(JournalSheet, 'defaultOptions', {
  enumerable: true,
  get() {
    return { ...(defaultOptions as {}), width: 620 };
  },
});

Compendium.prototype._renderInner = async function () {
  const existing = this.element?.[0]?.querySelector('compendium-list');
  const content = await this.getContent();
  if (existing) {
    existing.content = content;
    return $(existing);
  }
  const frag = new DocumentFragment();
  render(
    html`<compendium-list
      .content=${content}
      .compendium=${this}
    ></compendium-list>`,
    frag,
  );
  return $(frag);
};

Compendium.prototype._replaceHTML = noop;

SidebarDirectory.prototype._contextMenu = function (jqueryEl: JQuery) {
  jqueryEl[0]?.addEventListener('contextmenu', (ev) => {
    const entityLi = findMatchingElement(ev, '.entity, .folder .folder-header');
    if (!entityLi) return;
    const jqueryLi = $(entityLi);

    if (entityLi.matches('.entity')) {
      const entryOptions = this._getEntryContextOptions();
      Hooks.call(
        `get${this.constructor.name}EntryContext`,
        jqueryEl,
        entryOptions,
      );
      const convertedOptions = convertMenuOptions(entryOptions, jqueryLi);
      const heading = entityLi.querySelector('.entity-name')?.textContent;
      openMenu({
        content: convertedOptions,
        position: ev,
        header: heading ? { heading } : undefined,
      });
    } else if (entityLi.matches('.folder .folder-header')) {
      const folderOptions = this._getFolderContextOptions();
      Hooks.call(
        `get${this.constructor.name}FolderContext`,
        jqueryEl,
        folderOptions,
      );

      const convertedOptions = convertMenuOptions(folderOptions, jqueryLi);

      const heading = entityLi.textContent?.trim();
      openMenu({
        content: convertedOptions,
        position: ev,
        header: heading ? { heading } : undefined,
      });
    }
  });
};

CombatTracker.prototype._contextMenu = function (jqueryEl: JQuery) {
  jqueryEl[0]?.addEventListener('contextmenu', (ev) => {
    const item = findMatchingElement(ev, '.directory-item');
    if (!item) return;
    const targetEl = $(item);
    const entryOptions = this._getEntryContextOptions();
    Hooks.call(
      `get${this.constructor.name}EntryContext`,
      this.element,
      entryOptions,
    );
    const convertedOptions = convertMenuOptions(entryOptions, targetEl);
    const heading = item.textContent?.trim();
    openMenu({
      content: convertedOptions,
      position: ev,
      header: heading ? { heading } : undefined,
    });
  });
};

PlayerList.prototype.activateListeners = function (jqueryEl: JQuery) {
  jqueryEl[0]?.addEventListener('contextmenu', (ev) => {
    const item = findMatchingElement(ev, '.player');
    if (!item) return;
    const targetEl = $(item);

    const contextOptions = this._getUserContextOptions();
    Hooks.call(`getUserContextOptions`, this.element, contextOptions);
    const convertedOptions = convertMenuOptions(contextOptions, targetEl);
    const heading = item.textContent?.trim();
    openMenu({
      content: convertedOptions,
      position: ev,
      header: heading ? { heading } : undefined,
    });
  });
};

SceneNavigation.prototype.activateListeners = function (jqueryEl: JQuery) {
  const scenes = jqueryEl.find('.scene');
  scenes.click(this._onClickScene.bind(this));
  jqueryEl.find('#nav-toggle').click(this._onToggleNav.bind(this));

  jqueryEl[0]?.addEventListener('contextmenu', navMenuListener);
};

CompendiumDirectory.prototype._contextMenu = function (jqueryEl: JQuery) {
  jqueryEl[0]?.addEventListener('contextmenu', (ev) => {
    const item = findMatchingElement(ev, '.compendium-pack');
    if (!item) return;
    const entryOptions = this._getEntryContextOptions();
    Hooks.call(
      `get${this.constructor.name}EntryContext`,
      this.element,
      entryOptions,
    );
    const targetEl = $(item);
    const convertedOptions = convertMenuOptions(entryOptions, targetEl);
    const heading = item.querySelector('h4')?.textContent;
    openMenu({
      content: convertedOptions,
      position: ev,
      header: heading ? { heading } : undefined,
    });
  });
};

ChatLog.prototype._contextMenu = function (jqueryEl: JQuery) {
  jqueryEl[0]?.addEventListener('contextmenu', (ev) => {
    const item = findMatchingElement(ev, '.message');
    if (!item) return;
    // TODO Alter/Replace Chat popout
    const entryOptions = this._getEntryContextOptions();
    Hooks.call(
      `get${this.constructor.name}EntryContext`,
      this.element,
      entryOptions,
    );
    const targetEl = $(item);
    const convertedOptions = convertMenuOptions(entryOptions, targetEl);
    openMenu({ content: convertedOptions, position: ev });
  });
};

ChatMessage._getSpeakerFromUser = function ({
  scene,
  user,
  alias,
}: {
  scene: SceneEP | null;
  user: UserEP;
  alias?: string;
}) {
  return {
    scene: scene?.id ?? activeCanvas()?.scene?.id,
    actor: null,
    token: null,
    alias: alias || user.name,
  };
};

ChatMessage._getSpeakerFromActor = function ({
  scene,
  actor,
  alias,
}: {
  scene: SceneEP | null;
  actor: ActorEP;
  alias?: string;
}) {
  return {
    scene: scene?.id ?? activeCanvas()?.scene?.id,
    actor: actor.id,
    token: null,
    alias: alias || actor.name,
  };
};

const { close } = ChatPopout.prototype;
ChatPopout.prototype.close = async function () {
  delete this.message.apps[this.appId];
  close.call(this, []);
};

tinymce.FocusManager.isEditorUIElement = function (elm: Element) {
  const className = elm.className?.toString() ?? '';
  return className.indexOf('tox-') !== -1 || className.indexOf('mce-') !== -1;
};

const { _handleDragStart } = DragDrop.prototype;
DragDrop.prototype._handleDragStart = function (ev: DragEvent) {
  _handleDragStart.call(this, ev);
  let data: unknown = null;
  try {
    const stringified = ev.dataTransfer?.getData('text/plain');
    data = typeof stringified === 'string' && JSON.parse(stringified);
  } catch (error) {
    console.log(error);
  }
  if (isKnownDrop(data)) {
    onlySetDragSource(ev, data);
  }
};

function directorySearch(
  this: ActorDirectory | ItemDirectory,
  _: Event,
  query: string,
  html: HTMLElement,
) {
  const isSearch = !!query;
  const entityIds = new Set<string>();
  const folderIds = new Set<string>();

  // Match entities and folders
  if (isSearch) {
    const rgx = searchRegExp(query);

    // Match entity names
    for (const entity of this.entities) {
      if (entity.matchRegexp(rgx)) {
        entityIds.add(entity.id);
        if (entity.data.folder) folderIds.add(entity.data.folder);
      }
    }

    // Match folder tree
    const includeFolders = (fids: Set<string>) => {
      const parentIds = new Set(
        this.folders.flatMap(({ data, _id }) =>
          fids.has(_id) && data.parent ? data.parent : [],
        ),
      );
      if (parentIds.size) {
        parentIds.forEach((p) => folderIds.add(p));
        includeFolders(parentIds);
      }
    };
    includeFolders(folderIds);
  }

  // Toggle each directory item
  for (const el of html.querySelectorAll<HTMLElement>('.directory-item')) {
    const { entityId, folderId } = el.dataset;

    // Entities
    if (el.classList.contains('entity') && entityId) {
      el.style.display = !isSearch || entityIds.has(entityId) ? '' : 'none';
    }

    // Folders
    if (el.classList.contains('folder') && folderId) {
      const match = isSearch && folderIds.has(folderId);
      el.style.display = !isSearch || match ? '' : 'none';
      if (isSearch && match) el.classList.remove('collapsed');
      else el.classList.toggle('collapsed', !game.folders._expanded[folderId]);
    }
  }
}

ItemDirectory.prototype._onSearchFilter = directorySearch;
ActorDirectory.prototype._onSearchFilter = directorySearch;

const itemCreate = ({ itemInit }: ItemDataEvent) => {
  ItemEP.create(itemInit.data, itemInit.options);
};

const closeCreator = () => closeWindow(ItemCreator);

ItemDirectory.prototype._onCreateEntity = async function (ev: Event) {
  stopEvent(ev);

  if (ev.currentTarget instanceof HTMLElement) {
    openWindow({
      key: ItemCreator,
      content: html` <item-creator
        showFolders
        @close-creator=${closeCreator}
        @item-data=${itemCreate}
        folder=${ifDefined(ev.currentTarget.dataset.folder)}
      ></item-creator>`,
      name: `${localize('item')} ${localize('creator')}`,
      adjacentEl: ev.currentTarget,
    });
  }
};

ActorDirectory.prototype._onCreateEntity = async function (ev: Event) {
  stopEvent(ev);

  if (ev.currentTarget instanceof HTMLElement) {
    openWindow({
      key: ActorCreator,
      content: html`
        <actor-creator
          folder=${ifDefined(ev.currentTarget.dataset.folder)}
        ></actor-creator>
      `,
      name: `${localize('actor')} ${localize('creator')}`,
      adjacentEl: ev.currentTarget,
    });
  }
};
