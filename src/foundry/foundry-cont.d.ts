import type {
  ValueOf,
  Mutable,
  JsonObject,
  Class,
  ConditionalExcept,
  ConditionalPick,
} from 'type-fest';
import type {
  DeepPartial,
  DeepReadonly,
  PickByValue,
  ValuesType,
} from 'utility-types';
import type * as PIXI from 'pixi.js';
import type { Socket } from 'socket.io';
import type { Combatant } from '@src/combat/combatant';
import type { ActorEP } from '@src/entities/actor/actor';
import type { ChatMessageEP } from '@src/entities/chat-message';
import type { ItemEP } from '@src/entities/item/item';
import type { SceneEP } from '@src/entities/scene';
import type { UserEP } from '@src/entities/user';
import type {
  Environment,
  EnvironmentOverrides,
} from '@src/features/environment';
import type { EP, SystemSchema } from './system';
import type {
  ActorDatas,
  ActorModels,
  ItemDatas,
  ItemModels,
} from '@src/entities/models';
import type { EntityTemplates } from './template-schema';
import type { UserHotbarEntry } from '@src/features/hotbar-entry';
import type { MessageData } from '@src/chat/create-message';
import type { TinyMCE, RawEditorSettings } from 'tinymce';
import type { MeasuredTemplateData } from './canvas';
// * Comment out canvas, game, ui from foundry.d.ts
// * Add in context param to Entity.prototype._onUpdate
// * Add generic type to collection

type CONST = typeof CONST;

export type CommonEntityData = {
  name: string;
  img: string;
  _id: string;
  // flags: JsonObject;
  permission: Record<'default' | string, ValueOf<CONST['ENTITY_PERMISSIONS']>>;
  folder?: string;
  sort?: number;
};

export type EntityCreationOptions = Partial<{
  temporary: boolean;
  renderShoot: boolean;
}>;

export type EntitySheetOptions = {
  compendium?: string;
  editable: boolean;
};

export interface EntitySheet {
  // options: EntitySheetOptions;
  render(force: boolean, options?: Record<string, unknown>): this;
  close(): Promise<this>;
  maximize(): this;
  readonly rendered: boolean;
  readonly _minimized: boolean;
  submit(update: Record<string, unknown>): Promise<unknown>;
  bringToTop(): void;
}

export type TokenData = {
  flags: Record<string, unknown>;
  name: string;
  effects?: string[];
  overlayEffect?: string;
  displayName: ValueOf<CONST['TOKEN_DISPLAY_MODES']>;
  img: string;
  tint: null | unknown;
  hidden?: boolean;
  width: number;
  height: number;
  scale: number;
  mirrorX: boolean;
  mirrorY: boolean;
  lockRotation: boolean;
  rotation: number;
  vision: boolean;
  dimSight: number;
  brightSight: number;
  dimLight: number;
  brightLight: number;
  sightAngle: number;
  lightAngle: number;
  lightColor: string;
  lightAlpha: number;
  actorId: string;
  actorLink: boolean;
  actorData: DeepPartial<ActorDatas>;
  disposition: ValueOf<CONST['TOKEN_DISPOSITIONS']>;
  displayBars: ValueOf<CONST['TOKEN_DISPLAY_MODES']>;
  randomImg: boolean;
  elevation: number;
  _id: string;
  x: number;
  y: number;
  bar1: { attribute: string };
  bar2: { attribute: string };
};

type Config = typeof CONFIG;
type EntityName = keyof PickByValue<
  Config,
  { entityClass: Class<{ entity: unknown }> }
>;
export type EntityType = Config[EntityName]['entityClass'];

interface PlaceableObject {
  data: Record<string, unknown> & { _id?: string };
}

type LayerInfo<T extends PlaceableObject> = {
  placeables: T[];
  controlled: T[];
  get(tokenId: string): T | null | undefined;
  updateMany(
    data: (Partial<T['data']> & { _id: string })[],
    options?: unknown,
  ): Promise<void>;
};

type PlaceableLayer<
  L extends PlaceablesLayer,
  T extends PlaceableObject,
  F = LayerInfo<T>
> = Omit<L, keyof F> & F;

export type CanvasLayers = {
  background: BackgroundLayer;
  tiles: PlaceableLayer<TilesLayer, Tile>;
  drawings: PlaceableLayer<DrawingsLayer, Drawing>;
  grid: GridLayer;
  templates: PlaceableLayer<TemplateLayer, MeasuredTemplate>;
  walls: PlaceableLayer<WallsLayer, Wall>;
  notes: PlaceableLayer<NotesLayer, Note>;
  tokens: Omit<PlaceableLayer<TokenLayer, Token>, 'cycleTokens'> & {
    cycleTokens(forward: boolean, reset: boolean): boolean;
  };
  lighting: PlaceableLayer<LightingLayer, AmbientLight>;
  sight: SightLayer;
  sounds: PlaceableLayer<SoundsLayer, AmbientSound>;
  effects: EffectsLayer;
  controls: ControlsLayer;
};

type PlaceableLayers = ConditionalPick<CanvasLayers, { placeables: any[] }>;

type CombatRoundInfo = {
  round: number | null;
  tokenId: string | null;
  turn: number | null;
};

type Col<T extends Entity> = Omit<Collection<T>, 'get'> & {
  [Symbol.iterator](): IterableIterator<T>;
  get(id: string, options?: { strict: Boolean }): T | null;
  render(force: boolean): unknown;
  readonly _source: DeepReadonly<T['data'][]>;
};

type GameCollections = {
  users: Col<UserEP>;
  messages: Col<ChatMessageEP>;
  scenes: Col<SceneEP> & {
    preload(sceneId: string, push?: boolean): Promise<unknown>;
  };
  items: Col<ItemEP>;
  journal: Col<JournalEntry>;
  playlists: Col<Playlist>;
  combats: Col<Combat>;
  tables: Col<RollTable>;
  folders: Col<Folder> & { _expanded: Record<string, boolean> };
  actors: Col<ActorEP> & { tokens: Record<string, ActorEP> };
  macros: Col<Macro>;
};

declare global {
  const tinymce: TinyMCE;

  interface Compendium {
    readonly locked: boolean;
  }

  interface Collection<T> {
    find(condition: (entry: T) => boolean): T | null;
    filter(condition: (entry: T) => boolean): T[];
    map<M>(transform: (entry: T) => M): M[];
    reduce<I>(evaluator: (accum: I, entry: T) => I, initial: I): I;
  }

  interface GridLayer {
    getSnappedPosition(
      x: number,
      y: number,
      interval: number,
    ): { x: number; y: number };
    readonly type: ValuesType<CONST['GRID_TYPES']>;
    highlightLayers: Record<string, GridHighlight>;
  }

  interface GridHighlight {
    positions: Set<`${number}.${number}`>;
  }

  interface Token {
    data: Readonly<TokenData>;
    scene?: SceneEP;
    x: number;
    y: number;
    actor?: ActorEP | null;
    _validPosition: { x: number; y: number };
    bars: Record<'bar1' | 'bar2', PIXI.Graphics>;
    effects: PIXI.Container;
    update(tokenData: DeepPartial<TokenData>, options: unknown): Promise<Token>;
  }

  interface Combat {
    current: CombatRoundInfo;
    previous: CombatRoundInfo;
    data: {
      active: boolean;
      round: number;
      scene: string;
      turn: number;
      _id: string;

      combatants: Combatant[];
    };
    turns: Combatant[];
  }

  interface Compendium {
    readonly private: boolean;
    readonly metadata: Readonly<{
      label: string;
      name: string;
      // entity: EntityName;
      entity: string;
      package: string;
      absPath: string;
      path: string;
      system: string;
    }>;
  }

  interface Entity {
    readonly compendium: Compendium | null;
    matchRegexp(regex: RegExp): boolean;
  }

  interface Actor {
    data: ActorDatas;
    readonly items?: Collection<ItemEP>;
    readonly effects: Collection<ActiveEffect>;
    readonly token?: Token;
  }

  interface Item {
    data: ItemDatas;
  }

  interface String {
    capitalize(): string;
  }

  interface HeadsUpDisplay {
    token: TokenHUD;
  }

  interface Scene {
    _viewPosition: { x: number; y: number; scale: number };
    data: {
      flags: {
        [EP.Name]?: {
          environment: Readonly<Environment> | null;
          environmentOverrides: Readonly<EnvironmentOverrides> | null;
        };
      };
      tokens: TokenData[];
      active: boolean;
      backgroundColor: string;
      grid: number;
      gridDistance: number;
      gridUnits: string;
      name: string;
      navName: string;
      thumb?: string;
      _id: string;
    };
  }
  interface Ray {
    A: { x: number; y: number };
    B: { x: number; y: number };
  }
  interface SceneControls {
    activeControl: string;
  }

  interface DiceTerm {
    number: number;
  }

  interface Roll {
    readonly formula: string;
    readonly total: number | null;
    readonly terms: (DiceTerm | string | number)[];
    toJSON(): {
      class: 'Roll';
      dice: unknown[];
      terms: (string | number | unknown)[];
      results: (string | number)[];
      formula: string;
      total: number;
    };
  }

  interface Ray {
    distance: number;
  }

  interface SidebarTab {
    _popout: SidebarTab | null;
  }

  interface PlayerList {
    _showOffline: boolean;
  }

  interface Application {
    readonly position: Record<
      'width' | 'height' | 'left' | 'top' | 'scale',
      number
    >;
    _element: JQuery | null;
    readonly appId: string | number;
  }

  interface Macro {
    data: {
      actorIds: string[];
      author: string;
      command: string;
      img: string;
      name: string;
      type: 'script' | 'chat';
      _id: string;
    };
    sheet: Application | null;
  }

  interface MeasuredTemplate {
    readonly layer: TemplateLayer;
    data: MeasuredTemplateData;
  }

  interface PlaceablesLayer {
    preview: PIXI.Container | null;
  }

  interface User {
    active: boolean;
    targets: Set<Token>;
    isTrusted: boolean;
    readonly id: string;
    readonly viewedScene: string;
    can(permission: string): boolean;
    readonly isGM: boolean;
    readonly color: string;
    data: Readonly<
      CommonEntityData & {
        color: string;
        active: boolean;
        name: string;
        role: ValueOf<CONST['USER_ROLES']>;
        character?: string;
        avatar?: string;
        password: string;
        flags: {
          [EP.Name]?: Partial<{
            hotbar: UserHotbarEntry[];
          }>;
        };
      }
    >;
    update: (data: Record<string, unknown>) => Promise<unknown>;
  }

  interface Die {
    faces: number;
    results: ReturnType<DiceTerm['roll']>[];
    sides: number[];
  }

  interface ChatPopout {
    message: ChatMessageEP;
  }

  interface Localization {
    _fallback: {};
  }

  interface JournalEntry {
    data: { content: string };
  }

  interface ChatMessage {
    apps: Record<string | number, Application>;
    user: UserEP | undefined;
    _roll?: Roll | null;
  }

  interface ChatLog {
    _sentMessages: string[];
    _sentMessageIndex: number;
  }

  interface Canvas {
    ready: boolean;
  }

  interface TokenHUD {
    object?: Token;
  }

  interface Folder {
    displayed: boolean;
    data: {
      color: string;
      name: string;
      parent: string | null;
      sort: null | string;
      sorting: string;
      _id: string;
      type: EntityName;
    };
  }

  interface ItemDirectory {
    readonly entities: ItemEP[];
    readonly folders: Folder[];
  }

  interface ActorDirectory {
    readonly entities: ActorEP[];
    readonly folders: Folder[];
  }

  export function duplicate<T extends Record<string, unknown>>(
    data: T,
  ): Mutable<T>;
  export function timeSince(timestamp: Date | number): string;
  export function mergeObject<O, C>(
    orig: O,
    change: C,
    options?: Partial<{
      insertKeys: boolean;
      insertValues: boolean;
      overwrite: boolean;
      inplace: boolean;
      enforceTypes: boolean;
    }>,
  ): O & C;

  type System = {
    id: EP.Name;
    template: EntityTemplates;
    model: { Actor: ActorModels; Item: ItemModels };
    data: SystemSchema;
  };

  const game: GameCollections & {
    user: UserEP;
    packs: Collection<Compendium>;
    settings: ClientSettings;
    system: System;
    i18n: Localization;
    socket: Socket;
    keyboard: KeyboardManager;
    time: GameTime;
    readonly combat: Combat | null;
  };

  type UIClasses = typeof CONFIG.ui;
  type UI = {
    [key in keyof UIClasses]: InstanceType<UIClasses[key]>;
  } & { windows: Record<string, Application> };
  const ui: UI;

  const canvas: unknown;
}
