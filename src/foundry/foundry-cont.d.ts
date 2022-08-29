import type { MessageData } from '@src/chat/message-data';
import type { Combatant } from '@src/combat/combatant';
import type { ActorEP } from '@src/entities/actor/actor';
import type { ChatMessageEP } from '@src/entities/chat-message';
import type { ItemEP } from '@src/entities/item/item';
import type {
  ActorDatas,
  ActorModels,
  ItemDatas,
  ItemModels,
} from '@src/entities/models';
import type { SceneEP } from '@src/entities/scene';
import type { UserEP } from '@src/entities/user';
import type {
  Environment,
  EnvironmentOverrides,
} from '@src/features/environment';
import type { UserHotbarEntry } from '@src/features/hotbar-entry';
import type { PrototypeTokenData } from 'common/data/data';
import type { ActorData, SceneData } from 'common/data/module';
import type { Socket } from 'socket.io';
import type { TinyMCE } from 'tinymce';
import type { Class, ConditionalPick, Mutable, ValueOf } from 'type-fest';
import type {
  DeepPartial,
  DeepReadonly,
  PickByValue,
  ValuesType,
} from 'utility-types';
import type { MeasuredTemplateData } from './canvas';
import type { EP, SystemSchema } from './system';
import type { EntityTemplates } from './template-schema';
// * Comment out canvas, game, ui from foundry.d.ts
// * Add in context param to Entity.prototype._onUpdate
// * Add generic type to collection

type CONST = typeof CONST;

export type CommonEntityData = {
  name: string;
  img: string;
  _id: string;
  // flags: JsonObject;
  permission: Record<
    'default' | string,
    ValueOf<CONST['DOCUMENT_PERMISSION_LEVELS']>
  >;
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
  // readonly rendered: boolean;
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

export type FoundryDoc = import('common/abstract/module').Document;

type Config = typeof CONFIG;
type EntityName = Exclude<
  keyof PickByValue<Config, { documentClass: Class<{ documentName: string }> }>,
  'canvasTextStyle' | 'FogExploration'
>;
export type EntityType = Config[EntityName]['documentClass'];

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
  F = LayerInfo<T>,
> = Omit<L, keyof F> & F;

export type CanvasLayers = {
  background: PlaceableLayer<BackgroundLayer, Tile>;
  foreground: PlaceableLayer<BackgroundLayer, Tile>;

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

type FoundryCollection<T> = Map<string, T>;

type Col<T> = FoundryCollection<T> & {
  [Symbol.iterator](): IterableIterator<T>;
  // get(id: string, options?: { strict: Boolean }): T | null;
  render(force: boolean): unknown;
  importFromCompendium(
    collection: CompendiumCollection, // TODO this could possibly by typed with generic
    id: string,
    dataChanges?: {},
    options?: { renderSheet: boolean },
  );
  // readonly _source: DeepReadonly<T['data'][]>;
};

type GameCollections = {
  users: Col<UserEP> & { players: UserEP[] };
  messages: Col<ChatMessageEP>;
  scenes: Col<SceneEP> & {
    preload(sceneId: string, push?: boolean): Promise<unknown>;
    active?: SceneEP | null;
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
  const PIXI: PIXI;

  const foundry: {
    documents: typeof import('common/documents');
    utils: typeof import('common/utils/module');
    abstract: typeof import('common/abstract/module');
    data: typeof import('common/data/module');
    packages: typeof import('common/packages');
  };

  const CONST: typeof import('common/constants');

  const tinymce: TinyMCE;

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
    document: TokenDocument;
    scene?: SceneEP;
    x: number;
    y: number;
    actor?: ActorEP | null;
    _validPosition: { x: number; y: number };
    bars: Record<'bar1' | 'bar2', import('pixi.js').Graphics>;
    update(tokenData: DeepPartial<TokenData>, options: unknown): Promise<Token>;
    _controlled: boolean;
    hud: {
      effects: import('pixi.js').Container;
    };
  }

  interface PlaceableObject {
    document: unknown;
  }

  interface PrototypeTokenData extends TokenData {}

  interface TokenDocument extends TokenData {
    parent?: SceneEP;
    data: Readonly<TokenData>;
    name: string;
    object: Token | null;
    id: string;
    uuid: string;
    update(tokenData: DeepPartial<TokenData>, options: unknown): unknown;
    actor?: ActorEP;
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
    collection: CompendiumCollection;
  }

  interface CompendiumCollection {
    documentName: EntityName;
    metadata: {
      name: string;
      label: string;
      path: string;
      private: boolean;
      system: string;
    };
  }

  interface ActorData {
    items: FoundryCollection<ItemEP>;
    effects: FoundryCollection<ActiveEffect>;
    token: PrototypeTokenData | TokenDocument;
    img: string;
    folder: string | null;
  }

  interface Actor {
    /**
     * @deprecated Use `system` instead.
     */
    data: ActorData;
    system: ActorData;
    readonly items: FoundryCollection<ItemEP>;
    readonly effects: FoundryCollection<ActiveEffect>;
    toJSON(): ActorDatas;
    sheet: EntitySheet;
    collection?: GameCollections['actors'];
  }

  interface Item {
    /**
     * @deprecated Use `system` instead.
     */
    data: ItemData;
    system: ItemData;
    sheet: EntitySheet;
    toJSON(): ItemDatas;
    collection?: GameCollections['items'];
  }

  interface String {
    capitalize(): string;
  }

  interface HeadsUpDisplay {
    token: TokenHUD;
  }

  interface Scene {
    sheet: EntitySheet;
    _viewPosition: { x: number; y: number; scale: number };
    data: {
      flags: {
        [EP.Name]?: {
          environment: Readonly<Environment> | null;
          environmentOverrides: Readonly<EnvironmentOverrides> | null;
        };
      };
      tokens: FoundryCollection<TokenDocument>;
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
    x: number;
    y: number;
  }

  interface PlaceablesLayer {
    preview: import('pixi.js').Container | null;
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

  interface ActorData {
    _id: string;
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
    packs: FoundryCollection<CompendiumCollection>;
    settings: ClientSettings;
    system: System;
    i18n: Localization;
    socket: Socket;
    keyboard: KeyboardManager;
    time: GameTime;
    collections: Map<EntityName, GameCollections[keyof GameCollections]>;
    readonly combat: Combat | null;
  };

  type UIClasses = typeof CONFIG.ui;
  type UI = {
    [key in keyof UIClasses]: InstanceType<UIClasses[key]>;
  } & { windows: Record<string, Application> };
  const ui: UI;

  const canvas: unknown;
}
