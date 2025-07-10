import {
  CombatActionType,
  tokenIsInCombat,
  TrackedCombatEntity,
  updateCombatState,
} from '@src/combat/combat-tracker';
import {
  closeWindow,
  openWindow,
} from '@src/components/window/window-controls';
import { enumValues } from '@src/data-enums';
import type { ActorEP } from '@src/entities/actor/actor';
import { ActorCreator } from '@src/entities/actor/components/actor-creator/actor-creator';
import { ActorType } from '@src/entities/entity-types';
import { ItemCreator } from '@src/entities/item/components/item-creator/item-creator';
import type { ItemDataEvent } from '@src/entities/item/components/item-creator/item-data-event';
import { ItemEP } from '@src/entities/item/item';
import type { SceneEP } from '@src/entities/scene';
import type { UserEP } from '@src/entities/user';
import { ConditionType, iconToCondition } from '@src/features/conditions';
import { openMenu } from '@src/open-menu';
import { findMatchingElement } from '@src/utility/dom';
import { notEmpty, searchRegExp } from '@src/utility/helpers';
import { html, render } from 'lit-html';
import { ifDefined } from 'lit-html/directives/if-defined';
import { compact, first, mapToObj, noop, pipe } from 'remeda';
import { stopEvent } from 'weightless';
import { readyCanvas } from './canvas';
import { isKnownDrop, onlySetDragSource } from './drag-and-drop';
import { navMenuListener } from './foundry-apps';
import type { TokenData } from './foundry-cont';
import { localize } from './localization';
import { convertMenuOptions, gmIsConnected } from './misc-helpers';
import { activeTokenStatusEffects } from './token-helpers';

export const overridePrototypes = () => {
  const { getData } = UserConfig.prototype;
  UserConfig.prototype.getData = function () {
    const original = getData.call(this, {}) as {
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

  const { _onPreventDragstart } = Game.prototype;
  Game.prototype._onPreventDragstart = function (ev: DragEvent) {
    return pipe(ev.composedPath(), first(), (target) => {
      return target instanceof Element &&
        target.getAttribute('draggable') === 'true'
        ? undefined
        : _onPreventDragstart.call(this, ev);
    });
  };

  const { _onUpdate } = Token.prototype;

  Token.prototype._onUpdate = function (
    data: Partial<TokenData>,
    options: unknown,
    userId: string,
  ) {
    _onUpdate.call(this, data, options, userId);
    this.actor?.render(false, {});
  };

  Token.prototype._drawEffects = async function () {
    this.effects.renderable = false;

    // Clear Effects Container
    this.effects.removeChildren().forEach((c) => c.destroy());
    this.effects.bg = this.effects.addChild(new PIXI.Graphics());
    this.effects.overlay = null;

    // Categorize effects
    const activeEffects = this.actor?.temporaryEffects || [];
    let hasOverlay = false;

    // Draw effects
    const promises = [];
    for (const effect of activeEffects) {
      if (!effect.img) continue;
      if (effect.getFlag('core', 'overlay') && !hasOverlay) {
        promises.push(this._drawOverlay(effect.img, effect.tint));
        hasOverlay = true;
      } else promises.push(this._drawEffect(effect.img, effect.tint));
    }

    const effects = activeTokenStatusEffects(this);
    for (const iconPath of effects) {
      promises.push(this._drawEffect(iconPath, null));
    }
    await Promise.allSettled(promises);

    this.effects.renderable = true;
    //@ts-ignore
    this.renderFlags.set({ refreshEffects: true });
  };

  const { TokenHUD } = foundry.applications.hud;

  // @ts-expect-error
  const { getData: getTokenData, _getStatusEffectChoices, _prepareContext } = TokenHUD.prototype;

  // @ts-expect-error
  TokenHUD.prototype._prepareContext = async function (options: unknown) {
    const context = (await _prepareContext.call(this, options)) as {
      canToggleCombat: boolean;
      combatClass: 'active' | '';
    }
    context.canToggleCombat = gmIsConnected();
    context.combatClass =
      this.object && tokenIsInCombat(this.object) ? 'active' : '';

    return context;
  };

  Object.defineProperty(TokenDocument.prototype, 'inCombat', {
    get(this: TokenDocument): boolean {
      return this.object ? tokenIsInCombat(this.object) : false;
    },
  });


  // @ts-expect-error
  TokenHUD.DEFAULT_OPTIONS.actions.combat = function (event: Event) {
    const button = (event.currentTarget as HTMLElement).querySelector("button[data-action='combat']");
    event.preventDefault();
    if (!this.object?.scene || !(button instanceof HTMLElement)) {
      return;
    }
    const token = this.object;
    const addToCombat = !tokenIsInCombat(token);
    button.classList.toggle('active', addToCombat);
    const tokens = new Set(
      (readyCanvas()?.tokens.controlled ?? [])
        .concat(token ?? [])
        .filter((token) => {
          const inCombat = tokenIsInCombat(token);
          return inCombat !== addToCombat;
        }),
    );

    if (addToCombat) {
      updateCombatState({
        type: CombatActionType.AddParticipants,
        payload: [...tokens].flatMap((token) => {
          const { scene } = token;
          if (!scene) return [];
          return {
            name: token.name,
            hidden: !!token.document.hidden,
            entityIdentifiers: {
              type: TrackedCombatEntity.Token,
              tokenId: token.id,
              sceneId: scene.id,
            },
          };
        }),
      });
    } else {
      updateCombatState({
        type: CombatActionType.RemoveParticipantsByToken,
        payload: [...tokens].flatMap((token) => {
          const { scene } = token;
          if (!scene) return [];
          return {
            tokenId: token.id,
            sceneId: scene.id,
          };
        }),
      });
    }
  };

  TokenHUD.prototype._getStatusEffectChoices = function () {
    const choices = _getStatusEffectChoices.call(this) as Record<
      string,
      {
        cssClass: string;
        id: string;
        isActive: boolean;
        isOverlay: boolean;
        src: string;
        title: string;
        _id: string | undefined;
      }
    >;

    const token = this.object!;

    if (token.actor) {
      const actor = token.actor as ActorEP;
      for (const conditionType of enumValues(ConditionType)) {
        const isActive = actor.conditions.includes(conditionType);
        if (conditionType in choices && choices[conditionType]) {
          const choice = choices[conditionType]!;
          choice.isActive = isActive;
          if (isActive) {
            choice.cssClass += ' active';
          }
        }
      }
    }

    return choices;
  };



  const { defaultOptions: journalSheetOptions } = JournalSheet;
  Object.defineProperty(JournalSheet, 'defaultOptions', {
    enumerable: true,
    get() {
      return { ...(journalSheetOptions as {}), width: 620 };
    },
  });

  // const { defaultOptions: compendiumdefaults } = Compendium;
  // Object.defineProperty(Compendium, 'defaultOptions', {
  //   enumerable: true,
  //   get() {
  //     return {
  //       ...(compendiumdefaults as { classes: [] }),
  //       classes: (compendiumdefaults as { classes: string[] }).classes.concat(
  //         'ep-compendium-list',
  //       ),
  //     };
  //   },
  // });

  // Compendium.prototype._onSearchFilter = function (
  //   event: unknown,
  //   query: string,
  //   rgx: RegExp,
  //   html: HTMLElement,
  // ) {
  //   for (let li of html.children) {
  //     const header = li.querySelector('.document-name')!;
  //     const name = header.textContent;
  //     const type = header.getAttribute('data-type');
  //     const match =
  //       rgx.test(SearchFilter.cleanQuery(name)) ||
  //       (type && rgx.test(SearchFilter.cleanQuery(type)));
  //     (li as HTMLLinkElement).style.display = match ? 'flex' : 'none';
  //   }
  // };

  // const { _replaceHTML } = CombatTracker.prototype;
  // CombatTracker.prototype._replaceHTML = function (
  //   ...args: Parameters<typeof _replaceHTML>
  // ) {
  //   if (!this.popOut) {
  //     _replaceHTML.apply(this, args);
  //   }
  // };

  const { _replaceHTML } = CombatTracker.prototype;
  //@ts-expect-error
  CombatTracker.prototype._renderHTML = () => { };
  CombatTracker.prototype._replaceHTML = function (
    ...args: Parameters<typeof _replaceHTML>
  ) {
    const element = args[1] as HTMLElement;
    // @ts-expect-error
    const options = args[2] as { isFirstRender: boolean }
    if (options.isFirstRender) {
      render(
        html`<combat-view
      ></combat-view>`,
        element,
      );
    }
    // _replaceHTML.apply(this, args);
  };

  // CombatTracker.prototype._renderInner = async function () {
  //   const existing = this.element?.[0]?.querySelector('combat-view');
  //   if (existing) {
  //     return $(existing);
  //   }
  //   const frag = new DocumentFragment();
  //   render(
  //     html`<combat-view
  //       class="sidebar-tab tab"
  //       data-tab="combat"
  //     ></combat-view>`,
  //     frag,
  //   );
  //   return $(frag);
  // };

  // CombatTracker.prototype._contextMenu = function (jqueryEl: JQuery) {
  //   jqueryEl[0]?.addEventListener('contextmenu', (ev) => {
  //     const item = findMatchingElement(ev, '.directory-item');
  //     if (!item) return;
  //     const targetEl = $(item);
  //     const entryOptions = this._getEntryContextOptions();
  //     Hooks.call(
  //       `get${this.constructor.name}EntryContext`,
  //       this.element,
  //       entryOptions,
  //     );
  //     const convertedOptions = convertMenuOptions(entryOptions, targetEl);
  //     const heading = item.textContent?.trim();
  //     openMenu({
  //       content: convertedOptions,
  //       position: ev,
  //       header: heading ? { heading } : null,
  //     });
  //   });
  // };



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
      scene: scene?.id ?? readyCanvas()?.scene?.id,
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
      scene: scene?.id ?? readyCanvas()?.scene?.id,
      actor: actor.id,
      token: null,
      alias: alias || actor.name,
    };
  };

  // const { close } = ChatPopout.prototype;
  // ChatPopout.prototype.close = async function () {
  //   delete this.message.apps[this.appId];
  //   close.call(this, []);
  // };

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

  // function directorySearch(
  //   this: ActorDirectory | ItemDirectory,
  //   _: Event,
  //   query: string,
  //   rgx: RegExp,
  //   html: HTMLElement,
  // ) {
  //   const isSearch = !!query;
  //   const entityIds = new Set<string>();
  //   const folderIds = new Set<string>();

  //   // Match entities and folders
  //   if (isSearch) {
  //     const rgx = searchRegExp(query);

  //     // Match entity names
  //     for (const entity of this.entities) {
  //       if (entity.matchRegexp(rgx)) {
  //         entityIds.add(entity.id);
  //         if (entity.folder) folderIds.add(entity.folder.id);
  //       }
  //     }

  //     // Match folder tree
  //     const includeFolders = (folderIDs: Set<string>) => {
  //       const parentIds = new Set(
  //         this.folders.flatMap(({ data, _id }) =>
  //           folderIDs.has(_id) && data.parent ? data.parent : [],
  //         ),
  //       );
  //       if (parentIds.size) {
  //         parentIds.forEach((p) => folderIds.add(p));
  //         includeFolders(parentIds);
  //       }
  //     };
  //     includeFolders(folderIds);
  //   }

  //   // Toggle each directory item
  //   for (const el of html.querySelectorAll<HTMLElement>('.directory-item')) {
  //     const { entityId, folderId } = el.dataset;

  //     // Entities
  //     if (el.classList.contains('document') && entityId) {
  //       el.style.display = !isSearch || entityIds.has(entityId) ? '' : 'none';
  //     }

  //     // Folders
  //     if (el.classList.contains('folder') && folderId) {
  //       const match = isSearch && folderIds.has(folderId);
  //       el.style.display = !isSearch || match ? '' : 'none';
  //       if (isSearch && match) el.classList.remove('collapsed');
  //       else
  //         el.classList.toggle('collapsed', !game.folders._expanded[folderId]);
  //     }
  //   }
  // }

  // ItemDirectory.prototype._onSearchFilter = directorySearch;
  // ActorDirectory.prototype._onSearchFilter = directorySearch;

  const itemCreate = ({ itemInit }: ItemDataEvent) => {
    ItemEP.create(itemInit.data, itemInit.options);
  };

  const closeCreator = () => closeWindow(ItemCreator);

  ItemDirectory.prototype._onCreateEntry = async function (ev: Event) {
    stopEvent(ev);

    if (ev.currentTarget instanceof HTMLElement) {
      openWindow({
        key: ItemCreator,
        content: html` <item-creator
          showFolders
          @close-creator=${closeCreator}
          @item-data=${itemCreate}
          folder=${ifDefined(ev.currentTarget.dataset['folder'])}
        ></item-creator>`,
        name: `${localize('item')} ${localize('creator')}`,
        adjacentEl: ev.currentTarget,
      });
    }
  };

  ActorDirectory.prototype._onCreateEntry = async function (ev: Event) {
    stopEvent(ev);

    if (ev.currentTarget instanceof HTMLElement) {
      openWindow({
        key: ActorCreator,
        content: html`
          <actor-creator
            folder=${ifDefined(ev.currentTarget.dataset['folder'])}
          ></actor-creator>
        `,
        name: `${localize('actor')} ${localize('creator')}`,
        adjacentEl: ev.currentTarget,
      });
    }
  };
};
