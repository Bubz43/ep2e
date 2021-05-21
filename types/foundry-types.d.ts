declare module 'common/constants' {
  /** @module constants */
  /**
   * The shortened software name
   * @type {string}
   */
  export const vtt: string;
  /**
   * The full software name
   * @type {string}
   */
  export const VTT: string;
  /**
   * The software website URL
   * @type {string}
   */
  export const WEBSITE_URL: string;
  /**
   * An ASCII greeting displayed to the client
   * @type {string}
   */
  export const ASCII: string;
  /**
   * Define the allowed ActiveEffect application modes
   */
  export type ACTIVE_EFFECT_MODES = number;
  export namespace ACTIVE_EFFECT_MODES {
    const CUSTOM: number;
    const MULTIPLY: number;
    const ADD: number;
    const DOWNGRADE: number;
    const UPGRADE: number;
    const OVERRIDE: number;
  }
  /**
   * Define the string name used for the base entity type when specific sub-types are not defined by the system
   * @type {string}
   */
  export const BASE_ENTITY_TYPE: string;
  /**
   * Valid Chat Message types
   */
  export type CHAT_MESSAGE_TYPES = number;
  export namespace CHAT_MESSAGE_TYPES {
    const OTHER: number;
    const OOC: number;
    const IC: number;
    const EMOTE: number;
    const WHISPER: number;
    const ROLL: number;
  }
  /**
   * The allowed Entity types which may exist within a Compendium pack
   * This is a subset of ENTITY_TYPES
   * @type {string[]}
   */
  export const COMPENDIUM_ENTITY_TYPES: string[];
  /**
   * Define the set of languages which have built-in support in the core software
   * @type {string[]}
   */
  export const CORE_SUPPORTED_LANGUAGES: string[];
  /**
   * The default artwork used for Token images if none is provided
   * @type {string}
   */
  export const DEFAULT_TOKEN: string;
  /**
   * The default artwork used for Note placeables if none is provided
   * @type {string}
   */
  export const DEFAULT_NOTE_ICON: string;
  /**
   * The default icon image used for Macro documents if no other image is provided
   * @type {string}
   */
  export const DEFAULT_MACRO_ICON: string;
  /**
   * The supported dice roll visibility modes
   */
  export type DICE_ROLL_MODES = string;
  export namespace DICE_ROLL_MODES {
    const PUBLIC: string;
    const PRIVATE: string;
    const BLIND: string;
    const SELF: string;
  }
  /**
   * The allowed Drawing types which may be saved
   */
  export type DRAWING_TYPES = string;
  export namespace DRAWING_TYPES {
    const RECTANGLE: string;
    const ELLIPSE: string;
    const TEXT: string;
    const POLYGON: string;
    const FREEHAND: string;
  }
  /**
   * The allowed fill types which a Drawing object may display
   * NONE: The drawing is not filled
   * SOLID: The drawing is filled with a solid color
   * PATTERN: The drawing is filled with a tiled image pattern
   */
  export type DRAWING_FILL_TYPES = number;
  export namespace DRAWING_FILL_TYPES {
    const NONE: number;
    const SOLID: number;
    const PATTERN: number;
  }
  /**
   * Define the allowed Entity class types
   * @type {string[]}
   */
  export const ENTITY_TYPES: string[];
  /**
   * Define the allowed Entity types which may be dynamically linked in chat
   * @type {string[]}
   */
  export const ENTITY_LINK_TYPES: string[];
  /**
   * Define the allowed permission levels for a non-user Entity.
   * Each level is assigned a value in ascending order. Higher levels grant more permissions.
   */
  export type ENTITY_PERMISSIONS = number;
  export namespace ENTITY_PERMISSIONS {
    const NONE_1: number;
    export { NONE_1 as NONE };
    export const LIMITED: number;
    export const OBSERVER: number;
    export const OWNER: number;
  }
  /**
   * Define the allowed Entity types which Folders may contain
   * @type {string[]}
   */
  export const FOLDER_ENTITY_TYPES: string[];
  /**
   * The maximum allowed level of depth for Folder nesting
   * @type {number}
   */
  export const FOLDER_MAX_DEPTH: number;
  /**
   * A list of allowed game URL names
   * @type {string[]}
   */
  export const GAME_VIEWS: string[];
  /**
   * The minimum allowed grid size which is supported by the software
   * @type {number}
   */
  export const GRID_MIN_SIZE: number;
  /**
   * The allowed Grid types which are supported by the software
   */
  export type GRID_TYPES = number;
  export namespace GRID_TYPES {
    const GRIDLESS: number;
    const SQUARE: number;
    const HEXODDR: number;
    const HEXEVENR: number;
    const HEXODDQ: number;
    const HEXEVENQ: number;
  }
  /**
   * A list of supported setup URL names
   * @type {string[]}
   */
  export const SETUP_VIEWS: string[];
  /**
   * Enumerate the source types which can be used for an AmbientLight placeable object
   */
  export type SOURCE_TYPES = string;
  export namespace SOURCE_TYPES {
    const LOCAL: string;
    const GLOBAL: string;
    const UNIVERSAL: string;
  }
  /**
   * An Array of valid MacroAction scope values
   * @type {string[]}
   */
  export const MACRO_SCOPES: string[];
  /**
   * An enumeration of valid Macro types
   */
  export type MACRO_TYPES = string;
  export namespace MACRO_TYPES {
    const SCRIPT: string;
    const CHAT: string;
  }
  /**
   * The allowed playback modes for an audio Playlist
   * DISABLED: The playlist does not play on its own, only individual Sound tracks played as a soundboard
   * SEQUENTIAL: The playlist plays sounds one at a time in sequence
   * SHUFFLE: The playlist plays sounds one at a time in randomized order
   * SIMULTANEOUS: The playlist plays all contained sounds at the same time
   */
  export type PLAYLIST_MODES = number;
  export namespace PLAYLIST_MODES {
    const DISABLED: number;
    const SEQUENTIAL: number;
    const SHUFFLE: number;
    const SIMULTANEOUS: number;
  }
  /**
   * The allowed package types
   * @type {string[]}
   */
  export const PACKAGE_TYPES: string[];
  /**
   * Encode the reasons why a package may be available or unavailable for use
   */
  export type PACKAGE_AVAILABILITY_CODES = number;
  export namespace PACKAGE_AVAILABILITY_CODES {
    const UNKNOWN: number;
    const AVAILABLE: number;
    const REQUIRES_UPDATE: number;
    const REQUIRES_SYSTEM: number;
    const REQUIRES_DEPENDENCY: number;
    const REQUIRES_CORE: number;
  }
  /**
   * A safe password string which can be displayed
   * @type {string}
   */
  export const PASSWORD_SAFE_STRING: string;
  /**
   * The allowed software update channels
   */
  export type SOFTWARE_UPDATE_CHANNELS = string;
  export namespace SOFTWARE_UPDATE_CHANNELS {
    const alpha: string;
    const beta: string;
    const release: string;
  }
  /**
   * The default sorting density for manually ordering child objects within a parent
   * @type {number}
   */
  export const SORT_INTEGER_DENSITY: number;
  /**
   * The allowed types of a TableResult document
   */
  export type TABLE_RESULT_TYPES = number;
  export namespace TABLE_RESULT_TYPES {
    const TEXT_1: number;
    export { TEXT_1 as TEXT };
    export const ENTITY: number;
    export const COMPENDIUM: number;
  }
  /**
   * Define the valid anchor locations for a Tooltip displayed on a Placeable Object
   */
  export type TEXT_ANCHOR_POINTS = number;
  export namespace TEXT_ANCHOR_POINTS {
    const CENTER: number;
    const BOTTOM: number;
    const TOP: number;
    const LEFT: number;
    const RIGHT: number;
  }
  /**
   * Define the valid occlusion modes which an overhead tile can use
   */
  export type TILE_OCCLUSION_MODES = number;
  export namespace TILE_OCCLUSION_MODES {
    const NONE_2: number;
    export { NONE_2 as NONE };
    export const FADE: number;
    export const ROOF: number;
    export const RADIAL: number;
    export const VISION: number;
  }
  /**
   * Describe the various thresholds of token control upon which to show certain pieces of information
   * NONE - no information is displayed
   * CONTROL - displayed when the token is controlled
   * OWNER HOVER - displayed when hovered by a GM or a user who owns the actor
   * HOVER - displayed when hovered by any user
   * OWNER - always displayed for a GM or for a user who owns the actor
   * ALWAYS - always displayed for everyone
   */
  export type TOKEN_DISPLAY_MODES = number;
  export namespace TOKEN_DISPLAY_MODES {
    const NONE_3: number;
    export { NONE_3 as NONE };
    export const CONTROL: number;
    export const OWNER_HOVER: number;
    export const HOVER: number;
    const OWNER_1: number;
    export { OWNER_1 as OWNER };
    export const ALWAYS: number;
  }
  /**
   * The allowed Token disposition types
   * HOSTILE - Displayed as an enemy with a red border
   * NEUTRAL - Displayed as neutral with a yellow border
   * FRIENDLY - Displayed as an ally with a cyan border
   */
  export type TOKEN_DISPOSITIONS = number;
  export namespace TOKEN_DISPOSITIONS {
    const HOSTILE: number;
    const NEUTRAL: number;
    const FRIENDLY: number;
  }
  /**
   * Define the allowed User permission levels.
   * Each level is assigned a value in ascending order. Higher levels grant more permissions.
   */
  export type USER_ROLES = number;
  export namespace USER_ROLES {
    const NONE_4: number;
    export { NONE_4 as NONE };
    export const PLAYER: number;
    export const TRUSTED: number;
    export const ASSISTANT: number;
    export const GAMEMASTER: number;
  }
  /**
   * Invert the User Role mapping to recover role names from a role integer
   */
  export type USER_ROLE_NAMES = string;
  /**
   * Invert the User Role mapping to recover role names from a role integer
   * @enum {string}
   */
  export const USER_ROLE_NAMES: {};
  /**
   * An enumeration of the allowed types for a MeasuredTemplate embedded document
   */
  export type MEASURED_TEMPLATE_TYPES = string;
  export namespace MEASURED_TEMPLATE_TYPES {
    export const CIRCLE: string;
    export const CONE: string;
    const RECTANGLE_1: string;
    export { RECTANGLE_1 as RECTANGLE };
    export const RAY: string;
  }
  /**
   * A list of MIME types which are treated as uploaded "media", which are allowed to overwrite existing files.
   * Any non-media MIME type is not allowed to replace an existing file.
   * @type {string[]}
   */
  export const MEDIA_MIME_TYPES: string[];
  /**
   * @typedef {Object} UserCapability
   * @property {string} label
   * @property {string} hint
   * @property {boolean} disableGM
   * @property {number} defaultRole
   */
  /**
   * Define the recognized User capabilities which individual Users or role levels may be permitted to perform
   * @type {Object<UserCapability>}
   */
  export const USER_PERMISSIONS: any;
  /**
   * The allowed directions of effect that a Wall can have
   * BOTH: The wall collides from both directions
   * LEFT: The wall collides only when a ray strikes its left side
   * RIGHT: The wall collides only when a ray strikes its right side
   */
  export type WALL_DIRECTIONS = number;
  export namespace WALL_DIRECTIONS {
    export const BOTH: number;
    const LEFT_1: number;
    export { LEFT_1 as LEFT };
    const RIGHT_1: number;
    export { RIGHT_1 as RIGHT };
  }
  /**
   * The allowed door types which a Wall may contain
   * NONE: The wall does not contain a door
   * DOOR: The wall contains a regular door
   * SECRET: The wall contains a secret door
   */
  export type WALL_DOOR_TYPES = number;
  export namespace WALL_DOOR_TYPES {
    const NONE_5: number;
    export { NONE_5 as NONE };
    export const DOOR: number;
    export const SECRET: number;
  }
  /**
   * The allowed door states which may describe a Wall that contains a door
   * CLOSED: The door is closed
   * OPEN: The door is open
   * LOCKED: The door is closed and locked
   */
  export type WALL_DOOR_STATES = number;
  export namespace WALL_DOOR_STATES {
    const CLOSED: number;
    const OPEN: number;
    const LOCKED: number;
  }
  /**
   * The types of movement collision which a Wall may impose
   * NONE: Movement does not collide with this wall
   * NORMAL: Movement collides with this wall
   */
  export type WALL_MOVEMENT_TYPES = number;
  export namespace WALL_MOVEMENT_TYPES {
    const NONE_6: number;
    export { NONE_6 as NONE };
    export const NORMAL: number;
  }
  /**
   * The types of sensory collision which a Wall may impose
   * NONE: Senses do not collide with this wall
   * NORMAL: Senses collide with this wall
   * LIMITED: Senses collide with the second intersection, bypassing the first
   */
  export type WALL_SENSE_TYPES = number;
  export namespace WALL_SENSE_TYPES {
    const NONE_7: number;
    export { NONE_7 as NONE };
    const NORMAL_1: number;
    export { NORMAL_1 as NORMAL };
    const LIMITED_1: number;
    export { LIMITED_1 as LIMITED };
  }
  /**
   * The allowed set of HTML template extensions
   * @type {string[]}
   */
  export const HTML_FILE_EXTENSIONS: string[];
  /**
   * The supported file extensions for image-type files
   * @type {Array}
   */
  export const IMAGE_FILE_EXTENSIONS: any[];
  /**
   * The supported file extensions for video-type files
   * @type {Array}
   */
  export const VIDEO_FILE_EXTENSIONS: any[];
  /**
   * The supported file extensions for audio-type files
   * @type {Array}
   */
  export const AUDIO_FILE_EXTENSIONS: any[];
  /**
   * @deprecated since 0.8.0
   * @type {object}
   * @ignore
   */
  export const DRAWING_DEFAULT_VALUES: object;
  export type UserCapability = {
    label: string;
    hint: string;
    disableGM: boolean;
    defaultRole: number;
  };
}
declare module 'common/utils/helpers' {
  /**
   * @module helpers
   */
  /**
   * Benchmark the performance of a function, calling it a requested number of iterations.
   * @param {Function} func       The function to benchmark
   * @param {number} iterations   The number of iterations to test
   */
  export function benchmark(func: Function, iterations: number): void;
  /**
   * Wrap a callback in a debounced timeout.
   * Delay execution of the callback function until the function has not been called for delay milliseconds
   * @param {Function} callback       A function to execute once the debounced threshold has been passed
   * @param {number} delay            An amount of time in milliseconds to delay
   * @return {Function}               A wrapped function which can be called to debounce execution
   */
  export function debounce(callback: Function, delay: number): Function;
  /**
   * Quickly clone a simple piece of data, returning a copy which can be mutated safely.
   * This method DOES support recursive data structures containing inner objects or arrays.
   * This method DOES NOT support advanced object types like Set, Map, or other specialized classes.
   * @param {*} original      Some sort of data
   * @return {*}              The clone of that data
   */
  export function deepClone(original: any): any;
  /**
   * Deeply difference an object against some other, returning the update keys and values.
   * @param {object} original       An object comparing data against which to compare
   * @param {object} other          An object containing potentially different data
   * @param {object} [options={}]   Additional options which configure the diff operation
   * @param {boolean} [options.inner=false]  Only recognize differences in other for keys which also exist in original
   * @return {object}               An object of the data in other which differs from that in original
   */
  export function diffObject(
    original: object,
    other: object,
    {
      inner,
    }?: {
      inner: boolean;
    },
  ): object;
  /**
   * A cheap data duplication trick which is relatively robust.
   * For a subset of cases the deepClone function will offer better performance.
   * @param {Object} original   Some sort of data
   */
  export function duplicate(original: any): any;
  /**
   * Encode a url-like string by replacing any characters which need encoding
   * @param {string} path     A fully-qualified URL or url component (like a relative path)
   * @return {string}         An encoded URL string
   */
  export function encodeURL(path: string): string;
  /**
   * Expand a flattened object to be a standard multi-dimensional nested Object by converting all dot-notation keys to
   * inner objects.
   *
   * @param {object} obj      The object to expand
   * @param {Number} [_d=0]   Track the recursion depth to prevent overflow
   * @return {object}         An expanded object
   */
  export function expandObject(obj: object, _d?: number): object;
  /**
   * Filter the contents of some source object using the structure of a template object.
   * Only keys which exist in the template are preserved in the source object.
   *
   * @param {object} source           An object which contains the data you wish to filter
   * @param {object} template         An object which contains the structure you wish to preserve
   * @param {object} [options={}]     Additional options which customize the filtration
   * @param {boolean} [options.keepSpecial=false]     Whether to keep special tokens like deletion keys
   * @param {boolean} [options.templateValues=false]  Instead of keeping values from the source, instead draw values from the template
   *
   * @example
   * const source = {foo: {number: 1, name: "Tim", topping: "olives"}, bar: "baz"};
   * const template = {foo: {number: 0, name: "Mit", style: "bold"}, other: 72};
   * filterObject(source, template); // {foo: {number: 1, name: "Tim"}};
   * filterObject(source, template, {templateValues: true}); // {foo: {number: 0, name: "Mit"}};
   */
  export function filterObject(
    source: object,
    template: object,
    {
      keepSpecial,
      templateValues,
    }?: {
      keepSpecial: boolean;
      templateValues: boolean;
    },
  ): any;
  /**
   * Flatten a possibly multi-dimensional object to a one-dimensional one by converting all nested keys to dot notation
   * @param {object} obj        The object to flatten
   * @param {number} [_d=0]     Track the recursion depth to prevent overflow
   * @return {object}           A flattened object
   */
  export function flattenObject(obj: object, _d?: number): object;
  /**
   * Obtain references to the parent classes of a certain class.
   * @param {Function} cls      An ES6 Class definition
   * @return {Function[]}       An array of parent Classes which the provided class extends
   */
  export function getParentClasses(cls: Function): Function[];
  /**
   * A helper function which searches through an object to retrieve a value by a string key.
   * The string key supports the notation a.b.c which would return object[a][b][c]
   * @param {object} object   The object to traverse
   * @param {string} key      An object property with notation a.b.c
   * @return {*}              The value of the found property
   */
  export function getProperty(object: object, key: string): any;
  /**
   * Get the URL route for a certain path which includes a path prefix, if one is set
   * @param {string} path             The Foundry URL path
   * @param {string|null} [prefix]    A path prefix to apply
   * @returns {string}                The absolute URL path
   */
  export function getRoute(
    path: string,
    { prefix }?: { prefix: string | null },
  ): string;
  /**
   * Learn the named type of a token - extending the functionality of typeof to recognize some core Object types
   * @param {*} token     Some passed token
   * @return {string}     The named type of the token
   */
  export function getType(token: any): string;
  /**
   * A helper function which tests whether an object has a property or nested property given a string key.
   * The string key supports the notation a.b.c which would return true if object[a][b][c] exists
   * @param {object} object   The object to traverse
   * @param {string} key      An object property with notation a.b.c
   * @returns {boolean}       An indicator for whether the property exists
   */
  export function hasProperty(object: object, key: string): boolean;
  /**
   * Invert an object by assigning its values as keys and its keys as values.
   * @param {object} obj    The original object to invert
   * @returns {object}      The inverted object with keys and values swapped
   */
  export function invertObject(obj: object): object;
  /**
   * Return whether or not a target version (v1) is more advanced than some other reference version (v0).
   * Supports either numeric or string version comparison with version parts separated by periods.
   * @param {number|string} v1    The target version
   * @param {number|string} v0    The reference version
   * @return {boolean}            Is v1 a more advanced version than v0?
   */
  export function isNewerVersion(
    v1: number | string,
    v0: number | string,
  ): boolean;
  /**
   * A simple function to test whether or not an Object is empty
   * @param {object} obj    The object to test
   * @return {boolean}      Is the object empty?
   */
  export function isObjectEmpty(obj: object): boolean;
  /**
   * Update a source object by replacing its keys and values with those from a target object.
   *
   * @param {object} original       The initial object which should be updated with values from the target
   * @param {object} [other={}]     A new object whose values should replace those in the source
   * @param {object} [options={}]   Additional options which configure the merge
   * @param {boolean} [options.insertKeys=true]     Control whether to insert new top-level objects into the resulting structure which do not previously exist in the original object.
   * @param {boolean} [options.insertValues=true]   Control whether to insert new nested values into child objects in the resulting structure which did not previously exist in the original object.
   * @param {boolean} [options.overwrite=true]      Control whether to replace existing values in the source, or only merge values which do not already exist in the original object.
   * @param {boolean} [options.recursive=true]      Control whether to merge inner-objects recursively (if true), or whether to simply replace inner objects with a provided new value.
   * @param {boolean} [options.inplace=true]        Control whether to apply updates to the original object in-place (if true), otherwise the original object is duplicated and the copy is merged.
   * @param {boolean} [options.enforceTypes=false]  Control whether strict type checking requires that the value of a key in the other object must match the data type in the original data to be merged.
   * @param {number} [_d=0]         A privately used parameter to track recursion depth.
   * @returns {object}              The original source object including updated, inserted, or overwritten records.
   *
   * @example <caption>Control how new keys and values are added</caption>
   * mergeObject({k1: "v1"}, {k2: "v2"}, {insertKeys: false}); // {k1: "v1"}
   * mergeObject({k1: "v1"}, {k2: "v2"}, {insertKeys: true});  // {k1: "v1", k2: "v2"}
   * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {insertValues: false}); // {k1: {i1: "v1"}}
   * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {insertValues: true}); // {k1: {i1: "v1", i2: "v2"}}
   *
   * @example <caption>Control how existing data is overwritten</caption>
   * mergeObject({k1: "v1"}, {k1: "v2"}, {overwrite: true}); // {k1: "v2"}
   * mergeObject({k1: "v1"}, {k1: "v2"}, {overwrite: false}); // {k1: "v1"}
   *
   * @example <caption>Control whether merges are performed recursively</caption>
   * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {recursive: false}); // {k1: {i1: "v2"}}
   * mergeObject({k1: {i1: "v1"}}, {k1: {i2: "v2"}}, {recursive: true}); // {k1: {i1: "v1", i2: "v2"}}
   *
   * @example <caption>Deleting an existing object key</caption>
   * mergeObject({k1: "v1", k2: "v2"}, {"-=k1": null});   // {k2: "v2"}
   */
  export function mergeObject(
    original: object,
    other?: object,
    {
      insertKeys,
      insertValues,
      overwrite,
      recursive,
      inplace,
      enforceTypes,
    }?: {
      insertKeys: boolean;
      insertValues: boolean;
      overwrite: boolean;
      recursive: boolean;
      inplace: boolean;
      enforceTypes: boolean;
    },
    _d?: number,
  ): object;
  /**
   * Generate a random string ID of a given requested length.
   * @param {number} length    The length of the random ID to generate
   * @return {string}          Return a string containing random letters and numbers
   */
  export function randomID(length?: number): string;
  /**
   * A helper function which searches through an object to assign a value using a string key
   * This string key supports the notation a.b.c which would target object[a][b][c]
   * @param {object} object   The object to update
   * @param {string} key      The string key
   * @param {*} value         The value to be assigned
   * @return {boolean}        Whether the value was changed from its previous value
   */
  export function setProperty(object: object, key: string, value: any): boolean;
  /**
   * Express a timestamp as a relative string
   * TODO - figure out a way to localize this
   * @param {Date|string} timeStamp   A timestamp string or Date object to be formatted as a relative time
   * @return {string}                 A string expression for the relative time
   */
  export function timeSince(timeStamp: Date | string): string;
  /**
   * Converts an RGB color value to HSV. Conversion formula adapted from http://en.wikipedia.org/wiki/HSV_color_space.
   * Assumes r, g, and b are contained in the set [0, 1] and returns h, s, and v in the set [0, 1].
   * @param {number} r       The red color value
   * @param {number} g       The green color value
   * @param {number} b       The blue color value
   * @return {number[]}      The HSV representation
   */
  export function rgbToHsv(r: number, g: number, b: number): number[];
  /**
   * Converts an HSV color value to RGB. Conversion formula adapted from http://en.wikipedia.org/wiki/HSV_color_space.
   * Assumes h, s, and v are contained in the set [0, 1] and returns r, g, and b in the set [0, 1].
   * @param {number} h    The hue
   * @param {number} s    The saturation
   * @param {number} v    The value
   * @return {number[]}   The RGB representation
   */
  export function hsvToRgb(h: number, s: number, v: number): number[];
  /**
   * Converts a color as an [R, G, B] array of normalized floats to a hexadecimal number.
   * @param {number[]} rgb      Array of numbers where all values are normalized floats from 0.0 to 1.0.
   * @return {number}           The numeric color as hexadecimal
   */
  export function rgbToHex(rgb: number[]): number;
  /**
   * Convert a hex color code to an RGB array
   * @param {number} hex    A hex color number
   * @return {number[]}     An array of [r,g,b] colors normalized on the range of [0,1]
   */
  export function hexToRGB(hex: number): number[];
  /**
   * Convert a hex color code to an RGBA color string which can be used for CSS styling
   * @param {number} hex          A hex color number
   * @param {number} [alpha=1.0]  An optional level of transparency
   * @return {string}             An rgba style string
   */
  export function hexToRGBAString(hex: number, alpha?: number): string;
  /**
   * Convert a string color to a hex integer
   * @param {string} color    The string color
   * @return {number|null}    The hexadecimal color code
   */
  export function colorStringToHex(color: string): number | null;
}
declare module 'common/abstract/document' {
  export default Document;
  /**
   * The abstract base interface for all Document types.
   * @abstract
   * @interface
   * @memberof abstract
   */
  class Document {
    /**
     * Every document must define an object which represents its data schema.
     * This must be a subclass of the DocumentData interface.
     * @interface
     * @type {Function}
     */
    static get schema(): Function;
    /**
     * Default metadata which applies to each instance of this Document type.
     * @type {object}
     */
    static get metadata(): any;
    /**
     * The database backend used to execute operations and handle results
     * @type {DatabaseBackend}
     */
    static get database(): any;
    /**
     * Return a reference to the implemented subclass of this base document type.
     * @type {Function}
     */
    static get implementation(): Function;
    /**
     * The named collection to which this Document belongs.
     * @type {string}
     */
    static get collectionName(): string;
    /**
     * The canonical name of this Document type, for example "Actor".
     * @type {string}
     */
    static get documentName(): string;
    /**
     * Test whether a given User has a sufficient role in order to create Documents of this type.
     * @param {documents.BaseUser} user       The User being tested
     * @return {boolean}                      Does the User have a sufficient role to create?
     */
    static canUserCreate(user: any): boolean;
    /**
     * @typedef {Object} DocumentModificationContext
     * @property {Document} [parent]              A parent Document within which these Documents should be embedded
     * @property {string} [pack]                  A Compendium pack identifier within which the Documents should be modified
     * @property {boolean} [noHook=false]         Block the dispatch of preCreate hooks for this operation
     * @property {boolean} [index=false]          Return an index of the Document collection, used only during a get operation.
     * @property {boolean} [keepId=false]         When performing a creation operation, keep the provided _id instead of clearing it.
     * @property {boolean} [temporary=false]      Create a temporary document which is not saved to the database. Only used during creation.
     * @property {boolean} [render=true]          Automatically re-render existing applications associated with the document.
     * @property {boolean} [renderSheet=false]    Automatically create and render the Document sheet when the Document is first created.
     * @property {boolean} [diff=true]            Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
     * @property {boolean} [recursive=true]       Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
     * @property {boolean} [isUndo]               Is the operation undoing a previous operation, only used by embedded Documents within a Scene
     * @property {boolean} [deleteAll]            Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
     */
    /**
     * Create multiple Documents using provided input data.
     * Data is provided as an array of objects where each individual object becomes one new Document.
     *
     * @param {object[]} data                     An array of data objects used to create multiple documents
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the creation workflow
     * @return {Promise<Document[]>}              An array of created Document instances
     *
     * @example <caption>Create a single Document</caption>
     * const data = [{name: "New Actor", type: "character", img: "path/to/profile.jpg"}];
     * const created = await Actor.createDocuments(data);
     *
     * @example <caption>Create multiple Documents</caption>
     * const data = [{name: "Tim", type: "npc"], [{name: "Tom", type: "npc"}];
     * const created = await Actor.createDocuments(data);
     *
     * @example <caption>Create multiple embedded Documents within a parent</caption>
     * const actor = game.actors.getName("Tim");
     * const data = [{name: "Sword", type: "weapon"}, {name: "Breastplate", type: "equipment"}];
     * const created = await Item.createDocuments(data, {parent: actor});
     *
     * @example <caption>Create a Document within a Compendium pack</caption>
     * const data = [{name: "Compendium Actor", type: "character", img: "path/to/profile.jpg"}];
     * const created = await Actor.createDocuments(data, {pack: "mymodule.mypack"});
     */
    static createDocuments(
      data?: object[],
      context?: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<Document[]>;
    /**
     * Update multiple Document instances using provided differential data.
     * Data is provided as an array of objects where each individual object updates one existing Document.
     *
     * @param {object[]} updates                  An array of differential data objects, each used to update a single Document
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the update workflow
     * @return {Promise<Document[]>}              An array of updated Document instances
     *
     * @example <caption>Update a single Document</caption>
     * const updates = [{_id: "12ekjf43kj2312ds", name: "Timothy"}];
     * const updated = await Actor.updateDocuments(updates);
     *
     * @example <caption>Update multiple Documents</caption>
     * const updates = [{_id: "12ekjf43kj2312ds", name: "Timothy"}, {_id: "kj549dk48k34jk34", name: "Thomas"}]};
     * const updated = await Actor.updateDocuments(updates);
     *
     * @example <caption>Update multiple embedded Documents within a parent</caption>
     * const actor = game.actors.getName("Timothy");
     * const updates = [{_id: sword.id, name: "Magic Sword"}, {_id: shield.id, name: "Magic Shield"}];
     * const updated = await Item.updateDocuments(updates, {parent: actor});
     *
     * @example <caption>Update Documents within a Compendium pack</caption>
     * const actor = await pack.getDocument(documentId);
     * const updated = await Actor.updateDocuments([{_id: actor.id, name: "New Name"}], {pack: "mymodule.mypack"});
     */
    static updateDocuments(
      updates?: object[],
      context?: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<Document[]>;
    /**
     * Delete one or multiple existing Documents using an array of provided ids.
     * Data is provided as an array of string ids for the documents to delete.
     *
     * @param {string[]} ids                      An array of string ids for the documents to be deleted
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the deletion workflow
     * @return {Promise<Document[]>}              An array of deleted Document instances
     *
     * @example <caption>Delete a single Document</caption>
     * const tim = game.actors.getName("Tim");
     * const deleted = await Actor.deleteDocuments([tim.id]);
     *
     * @example <caption>Delete multiple Documents</caption>
     * const tim = game.actors.getName("Tim");
     * const tom = game.actors.getName("Tom");
     * const deleted = await Actor.deleteDocuments([tim.id, tom.id]);
     *
     * @example <caption>Delete multiple embedded Documents within a parent</caption>
     * const tim = game.actors.getName("Tim");
     * const sword = tim.items.getName("Sword");
     * const shield = tim.items.getName("Shield");
     * const deleted = await Item.deleteDocuments([sword.id, shield.id], parent: actor});
     *
     * @example <caption>Delete Documents within a Compendium pack</caption>
     * const actor = await pack.getDocument(documentId);
     * const deleted = await Actor.deleteDocuments([actor.id], {pack: "mymodule.mypack"});
     */
    static deleteDocuments(
      ids?: string[],
      context?: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<Document[]>;
    /**
     * Create a new Document using provided input data, saving it to the database.
     * @see {@link Document.createDocuments}
     * @param {object} [data={}]                  Initial data used to create this Document
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the creation workflow
     * @return {Promise<Document>}                The created Document instance
     *
     * @example <caption>Create a World-level Item</caption>
     * const data = [{name: "Special Sword", type: "weapon"}];
     * const created = await Item.create(data);
     *
     * @example <caption>Create an Actor-owned Item</caption>
     * const data = [{name: "Special Sword", type: "weapon"}];
     * const actor = game.actors.getName("My Hero");
     * const created = await Item.create(data, {parent: actor});
     *
     * @example <caption>Create an Item in a Compendium pack</caption>
     * const data = [{name: "Special Sword", type: "weapon"}];
     * const created = await Item.create(data, {pack: "mymodule.mypack"});
     */
    static create(
      data?: object,
      context?: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<Document>;
    /**
     * Perform follow-up operations when a set of Documents of this type are created.
     * This is where side effects of creation should be implemented.
     * Post-creation side effects are performed only for the client which requested the operation.
     * @param {Document[]} documents                    The Document instances which were created
     * @param {DocumentModificationContext} context     The context for the modification operation
     * @protected
     */
    protected static _onCreateDocuments(
      documents: Document[],
      context: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<void>;
    /**
     * Perform follow-up operations when a set of Documents of this type are updated.
     * This is where side effects of updates should be implemented.
     * Post-update side effects are performed only for the client which requested the operation.
     * @param {Document[]} documents                    The Document instances which were updated
     * @param {DocumentModificationContext} context     The context for the modification operation
     * @protected
     */
    protected static _onUpdateDocuments(
      documents: Document[],
      context: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<void>;
    /**
     * Perform follow-up operations when a set of Documents of this type are deleted.
     * This is where side effects of deletion should be implemented.
     * Post-deletion side effects are performed only for the client which requested the operation.
     * @param {Document[]} documents                    The Document instances which were deleted
     * @param {DocumentModificationContext} context     The context for the modification operation
     * @protected
     */
    protected static _onDeleteDocuments(
      documents: Document[],
      context: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<void>;
    /**
     * Create a new Document by providing an initial data object.
     * @param {object} [data={}]        Initial data provided to construct the Document
     * @param {object} [context={}]     Additional parameters which define Document context
     * @param {Document} [context.parent]   A parent document within which this Document is embedded
     * @param {string} [context.pack]       A named compendium pack within which this Document exists
     */
    constructor(
      data?: object,
      context?: {
        parent: Document;
        pack: string;
      },
    );
    /**
     * Perform one-time initialization tasks which only occur when the Document is first constructed.
     * @protected
     */
    protected _initialize(): void;
    /**
     * The named collection to which this Document belongs.
     * @type {string}
     */
    get collectionName(): string;
    /**
     * The canonical name of this Document type, for example "Actor".
     * @type {string}
     */
    get documentName(): string;
    /**
     * The canonical identifier for this Document
     * @type {string|null}
     */
    get id(): string;
    /**
     * Test whether this Document is embedded within a parent Document
     * @type {boolean}
     */
    get isEmbedded(): boolean;
    /**
     * The name of this Document, if it has one assigned
     * @type {string|null}
     */
    get name(): string;
    /**
     * Clone a document, creating a new document by combining current data with provided overrides.
     * The cloned document is ephemeral and not yet saved to the database.
     * @param {Object} [data={}]                Additional data which overrides current document data at the time of creation
     * @param {object} [options={}]             Additional options which customize the creation workflow
     * @param {boolean} [options.save=false]    Save the clone to the World database?
     * @param {boolean} [options.keepId=false]  Keep the original Document ID? Otherwise the ID will become undefined
     * @returns {Document|Promise<Document>}    The cloned Document instance
     */
    clone(
      data?: any,
      options?: {
        save: boolean;
        keepId: boolean;
      },
    ): Document | Promise<Document>;
    /**
     * Get the permission level that a specific User has over this Document, a value in CONST.ENTITY_PERMISSIONS.
     * @param {documents.BaseUser} user     The User being tested
     * @returns {number|null}               A numeric permission level from CONST.ENTITY_PERMISSIONS or null
     */
    getUserLevel(user: any): number | null;
    /**
     * Test whether a certain User has a requested permission level (or greater) over the Document
     * @param {documents.BaseUser} user       The User being tested
     * @param {string|number} permission      The permission level from ENTITY_PERMISSIONS to test
     * @param {object} options                Additional options involved in the permission test
     * @param {boolean} [options.exact=false]     Require the exact permission level requested?
     * @return {boolean}                      Does the user have this permission level over the Document?
     */
    testUserPermission(
      user: any,
      permission: string | number,
      {
        exact,
      }?: {
        exact: boolean;
      },
    ): boolean;
    /**
     * Test whether a given User has permission to perform some action on this Document
     * @param {documents.BaseUser} user   The User attempting modification
     * @param {string} action             The attempted action
     * @param {object} [data]             Data involved in the attempted action
     * @return {boolean}                  Does the User have permission?
     */
    canUserModify(user: any, action: string, data?: object): boolean;
    /**
     * Update this Document using incremental data, saving it to the database.
     * @see {@link Document.updateDocuments}
     * @param {object} [data={}]                  Differential update data which modifies the existing values of this document data
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the update workflow
     * @returns {Promise<Document>}               The updated Document instance
     */
    update(
      data?: object,
      context?: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<Document>;
    /**
     * Delete this Document, removing it from the database.
     * @see {@link Document.deleteDocuments}
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the deletion workflow
     * @returns {Promise<Document>}               The deleted Document instance
     */
    delete(context?: {
      /**
       * A parent Document within which these Documents should be embedded
       */
      parent?: Document;
      /**
       * A Compendium pack identifier within which the Documents should be modified
       */
      pack?: string;
      /**
       * Block the dispatch of preCreate hooks for this operation
       */
      noHook?: boolean;
      /**
       * Return an index of the Document collection, used only during a get operation.
       */
      index?: boolean;
      /**
       * When performing a creation operation, keep the provided _id instead of clearing it.
       */
      keepId?: boolean;
      /**
       * Create a temporary document which is not saved to the database. Only used during creation.
       */
      temporary?: boolean;
      /**
       * Automatically re-render existing applications associated with the document.
       */
      render?: boolean;
      /**
       * Automatically create and render the Document sheet when the Document is first created.
       */
      renderSheet?: boolean;
      /**
       * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
       */
      diff?: boolean;
      /**
       * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
       */
      recursive?: boolean;
      /**
       * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
       */
      isUndo?: boolean;
      /**
       * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
       */
      deleteAll?: boolean;
    }): Promise<Document>;
    /**
     * Obtain a reference to the Array of source data within the data object for a certain embedded Document name
     * @param {string} embeddedName   The name of the embedded Document type
     * @return {Collection}           The Collection instance of embedded Documents of the requested type
     */
    getEmbeddedCollection(embeddedName: string): any;
    /**
     * Get an embedded document by it's id from a named collection in the parent document.
     * @param {string} embeddedName   The name of the embedded Document type
     * @param {string} id             The id of the child document to retrieve
     * @param {object} [options]      Additional options which modify how embedded documents are retrieved
     * @param {boolean} [options.strict=false] Throw an Error if the requested id does not exist. See Collection#get
     * @return {Document}             The retrieved embedded Document instance, or undefined
     */
    getEmbeddedDocument(
      embeddedName: string,
      id: string,
      {
        strict,
      }?: {
        strict: boolean;
      },
    ): Document;
    /**
     * Create multiple embedded Document instances within this parent Document using provided input data.
     * @see {@link Document.createDocuments}
     * @param {string} embeddedName               The name of the embedded Document type
     * @param {object[]} data                     An array of data objects used to create multiple documents
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the creation workflow
     * @return {Promise<Document[]>}              An array of created Document instances
     */
    createEmbeddedDocuments(
      embeddedName: string,
      data?: object[],
      context?: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<Document[]>;
    /**
     * Update multiple embedded Document instances within a parent Document using provided differential data.
     * @see {@link Document.updateDocuments}
     * @param {string} embeddedName               The name of the embedded Document type
     * @param {object[]} updates                  An array of differential data objects, each used to update a single Document
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the update workflow
     * @return {Promise<Document[]>}              An array of updated Document instances
     */
    updateEmbeddedDocuments(
      embeddedName: string,
      updates?: object[],
      context?: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<Document[]>;
    /**
     * Delete multiple embedded Document instances within a parent Document using provided string ids.
     * @see {@link Document.deleteDocuments}
     * @param {string} embeddedName               The name of the embedded Document type
     * @param {string[]} ids                      An array of string ids for each Document to be deleted
     * @param {DocumentModificationContext} [context={}] Additional context which customizes the deletion workflow
     * @return {Promise<Document[]>}              An array of deleted Document instances
     */
    deleteEmbeddedDocuments(
      embeddedName: string,
      ids: string[],
      context?: {
        /**
         * A parent Document within which these Documents should be embedded
         */
        parent?: Document;
        /**
         * A Compendium pack identifier within which the Documents should be modified
         */
        pack?: string;
        /**
         * Block the dispatch of preCreate hooks for this operation
         */
        noHook?: boolean;
        /**
         * Return an index of the Document collection, used only during a get operation.
         */
        index?: boolean;
        /**
         * When performing a creation operation, keep the provided _id instead of clearing it.
         */
        keepId?: boolean;
        /**
         * Create a temporary document which is not saved to the database. Only used during creation.
         */
        temporary?: boolean;
        /**
         * Automatically re-render existing applications associated with the document.
         */
        render?: boolean;
        /**
         * Automatically create and render the Document sheet when the Document is first created.
         */
        renderSheet?: boolean;
        /**
         * Difference each update object against current Document data to reduce the size of the transferred data. Only used during update.
         */
        diff?: boolean;
        /**
         * Merge objects recursively. If false, inner objects will be replaced explicitly. Use with caution!
         */
        recursive?: boolean;
        /**
         * Is the operation undoing a previous operation, only used by embedded Documents within a Scene
         */
        isUndo?: boolean;
        /**
         * Whether to delete all documents of a given type, regardless of the array of ids provided. Only used during a delete operation.
         */
        deleteAll?: boolean;
      },
    ): Promise<Document[]>;
    /**
     * Get the value of a "flag" for this document
     * See the setFlag method for more details on flags
     *
     * @param {string} scope        The flag scope which namespaces the key
     * @param {string} key          The flag key
     * @return {*}                  The flag value
     */
    getFlag(scope: string, key: string): any;
    /**
     * Assign a "flag" to this document.
     * Flags represent key-value type data which can be used to store flexible or arbitrary data required by either
     * the core software, game systems, or user-created modules.
     *
     * Each flag should be set using a scope which provides a namespace for the flag to help prevent collisions.
     *
     * Flags set by the core software use the "core" scope.
     * Flags set by game systems or modules should use the canonical name attribute for the module
     * Flags set by an individual world should "world" as the scope.
     *
     * Flag values can assume almost any data type. Setting a flag value to null will delete that flag.
     *
     * @param {string} scope        The flag scope which namespaces the key
     * @param {string} key          The flag key
     * @param {*} value             The flag value
     * @return {Promise<Document>}  A Promise resolving to the updated document
     */
    setFlag(scope: string, key: string, value: any): Promise<Document>;
    /**
     * Remove a flag assigned to the document
     * @param {string} scope        The flag scope which namespaces the key
     * @param {string} key          The flag key
     * @return {Promise<Document>}  The updated document instance
     */
    unsetFlag(scope: string, key: string): Promise<Document>;
    /**
     * Perform preliminary operations before a Document of this type is created.
     * Pre-creation operations only occur for the client which requested the operation.
     * @param {DocumentData} data         The initial data used to create the document
     * @param {object} options            Additional options which modify the creation request
     * @param {documents.BaseUser} user   The User requesting the document creation
     * @protected
     */
    protected _preCreate(data: any, options: object, user: any): Promise<void>;
    /**
     * Perform preliminary operations before a Document of this type is updated.
     * Pre-update operations only occur for the client which requested the operation.
     * @param {object} changed            The differential data that is changed relative to the documents prior values
     * @param {object} options            Additional options which modify the update request
     * @param {documents.BaseUser} user   The User requesting the document update
     * @protected
     */
    protected _preUpdate(
      changed: object,
      options: object,
      user: any,
    ): Promise<void>;
    /**
     * Perform preliminary operations before a Document of this type is deleted.
     * Pre-delete operations only occur for the client which requested the operation.
     * @param {object} options            Additional options which modify the deletion request
     * @param {documents.BaseUser} user   The User requesting the document deletion
     * @protected
     */
    protected _preDelete(options: object, user: any): Promise<void>;
    /**
     * Perform follow-up operations after a Document of this type is created.
     * Post-creation operations occur for all clients after the creation is broadcast.
     * @param {DocumentData} data         The data from which the document was created
     * @param {object} options            Additional options which modify the creation request
     * @param {documents.BaseUser} user   The User requesting the document creation
     * @protected
     */
    protected _onCreate(data: any, options: object, user: any): void;
    /**
     * Perform follow-up operations after a Document of this type is updated.
     * Post-update operations occur for all clients after the update is broadcast.
     * @param {object} changed            The differential data that was changed relative to the documents prior values
     * @param {object} options            Additional options which modify the update request
     * @param {documents.BaseUser} user   The User requesting the document update
     * @protected
     */
    protected _onUpdate(changed: object, options: object, user: any): void;
    /**
     * Perform follow-up operations after a Document of this type is deleted.
     * Post-deletion operations occur for all clients after the deletion is broadcast.
     * @param {object} options            Additional options which modify the deletion request
     * @param {documents.BaseUser} user   The User requesting the document deletion
     * @protected
     */
    protected _onDelete(options: object, user: any): void;
    /**
     * Transform the Document instance into a plain object.
     * The created object is an independent copy of the original data.
     * See DocumentData#toObject
     * @param {boolean} [source=true]     Draw values from the underlying data source rather than transformed values
     * @returns {object}                  The extracted primitive object
     */
    toObject(source?: boolean): object;
    /**
     * Convert the Document instance to a primitive object which can be serialized.
     * See DocumentData#toJSON
     * @returns {object}                  The document data expressed as a plain object
     */
    toJSON(): object;
  }
}
declare module 'common/abstract/backend' {
  export default DatabaseBackend;
  /**
   * An interface which is required by both client and server-side to provide implementations for document operations.
   * @abstract
   * @interface
   * @memberof abstract
   */
  class DatabaseBackend {
    /**
     * Retrieve Documents based on provided query parameters
     * @param {Function} documentClass        The Document definition
     * @param {object} request                The requested operation
     * @param {User} user                     The requesting User
     * @returns {Document[]}                  The created Document instances
     */
    get(documentClass: Function, request: object, user: any): Document[];
    /**
     * Validate the arguments passed to the get operation
     * @param {object} request                The requested operation
     * @param {object} [request.query={}]     A document search query to execute
     * @param {object} [request.options={}]   Operation options
     * @param {string} [request.pack]         A Compendium pack identifier
     * @private
     */
    private _getArgs;
    /**
     * Get primary Document instances
     * @protected
     */
    protected _getDocuments(
      documentClass: any,
      query: any,
      options: any,
      user: any,
    ): Promise<void>;
    /**
     * Get embedded Document instances
     * @protected
     */
    protected _getEmbeddedDocuments(
      documentClass: any,
      parent: any,
      query: any,
      options: any,
      user: any,
    ): Promise<void>;
    /**
     * Get the parent Document (if any) associated with a request
     * @param {object} request                The requested operation
     * @return {Promise<Document|null>}       The parent Document, or null
     * @private
     */
    private _getParent;
    /**
     * Perform document creation operations
     * @param {Function} documentClass        The Document definition
     * @param {object} request                The requested operation
     * @param {User} user                     The requesting User
     * @returns {Document[]}                  The created Document instances
     */
    create(documentClass: Function, request: object, user: any): Document[];
    /**
     * Validate the arguments passed to the create operation
     * @param {object} request                The requested operation
     * @param {object[]} request.data         An array of document data
     * @param {object} [request.options={}]   Operation options
     * @param {string} [request.pack]         A Compendium pack identifier
     * @private
     */
    private _createArgs;
    /**
     * Create primary Document instances
     * @returns {Promise<Document[]>}
     * @protected
     */
    protected _createDocuments(
      documentClass: any,
      request: any,
      user: any,
    ): Promise<Document[]>;
    /**
     * Create embedded Document instances
     * @returns {Promise<Document[]>}
     * @protected
     */
    protected _createEmbeddedDocuments(
      documentClass: any,
      parent: any,
      request: any,
      user: any,
    ): Promise<Document[]>;
    /**
     * Perform document update operations
     * @param {Function} documentClass        The Document definition
     * @param {object} request                The requested operation
     * @param {User} user                     The requesting User
     * @returns {Document[]}                  The updated Document instances
     */
    update(documentClass: Function, request: object, user: any): Document[];
    /**
     * Validate the arguments passed to the update operation
     * @param {object} request                The requested operation
     * @param {object[]} request.updates      An array of document data
     * @param {object} [request.options={}]   Operation options
     * @param {string} [request.pack]         A Compendium pack identifier
     * @private
     */
    private _updateArgs;
    /**
     * Update primary Document instances
     * @returns {Promise<Document[]>}
     * @protected
     */
    protected _updateDocuments(
      documentClass: any,
      request: any,
      user: any,
    ): Promise<Document[]>;
    /**
     * Update embedded Document instances
     * @returns {Promise<Document[]>}
     * @protected
     */
    protected _updateEmbeddedDocuments(
      documentClass: any,
      parent: any,
      request: any,
      user: any,
    ): Promise<Document[]>;
    /**
     * Perform document deletion operations
     * @param {Function} documentClass        The Document definition
     * @param {object} request                The requested operation
     * @param {User} user                     The requesting User
     * @returns {Document[]}                  The deleted Document instances
     */
    delete(documentClass: Function, request: object, user: any): Document[];
    /**
     * Validate the arguments passed to the delete operation
     * @param {object} request                The requested operation
     * @param {string[]} request.ids          An array of document ids
     * @param {object} [request.options={}]   Operation options
     * @param {string} [request.pack]         A Compendium pack identifier
     * @private
     */
    private _deleteArgs;
    /**
     * Delete primary Document instances
     * @returns {Promise<Document[]>}
     * @protected
     */
    protected _deleteDocuments(
      documentClass: any,
      request: any,
      user: any,
    ): Promise<Document[]>;
    /**
     * Delete embedded Document instances
     * @returns {Promise<Document[]>}
     * @protected
     */
    protected _deleteEmbeddedDocuments(
      documentClass: any,
      parent: any,
      request: any,
      user: any,
    ): Promise<Document[]>;
    /**
     * Describe the scopes which are suitable as the namespace for a flag key
     * @returns {string[]}
     * @protected
     */
    protected getFlagScopes(): string[];
    /**
     * Describe the scopes which are suitable as the namespace for a flag key
     * @returns {string[]}
     * @protected
     */
    protected getCompendiumScopes(): string[];
    /**
         * Provide the Logger implementation that should be used for database operations
        //  * @return {Logger|Console}
         * @protected 
         */
    protected _getLogger(): any | Console;
    /**
     * Log a database operation for an embedded document, capturing the action taken and relevant IDs
     * @param {string} action                       The action performed
     * @param {string} type                         The document type
     * @param {abstract.Document[]} documents       The documents modified
     * @param {string} [level=info]                 The logging level
     * @param {abstract.Document} [parent]          A parent document
     * @param {string} [pack]                       A compendium pack within which the operation occurred
     * @protected
     */
    protected _logOperation(
      action: string,
      type: string,
      documents: any[],
      {
        parent,
        pack,
        level,
      }?: { parent: unknown; pack: string; level: string },
    ): void;
    /**
     * Construct a standardized error message given the context of an attempted operation
     * @returns {string}
     * @protected
     */
    protected _logError(
      user: any,
      action: any,
      subject: any,
      {
        parent,
        pack,
      }?: {
        parent: any;
        pack: any;
      },
    ): string;
    /**
     * Determine a string suffix for a log message based on the parent and/or compendium context.
     * @returns {string}
     * @private
     */
    private _logContext;
  }
  import Document from 'common/abstract/document';
}
declare module 'common/utils/collection' {
  export default Collection;
  /**
   * A reusable storage concept which blends the functionality of an Array with the efficient key-based lookup of a Map.
   * This concept is reused throughout Foundry VTT where a collection of uniquely identified elements is required.
   * @extends {Map}
   * @type {Map}
   */
  class Collection<T> extends Map<string, T> {
    /**
     * Return an Array of all the entry values in the Collection
     * @type {Array<*>}
     */
    get contents(): any[];
    /**
     * Find an entry in the Map using an functional condition.
     * @see {Array#find}
     *
     * @param {Function} condition  The functional condition to test
     * @return {*}                  The value, if found, otherwise undefined
     *
     * @example
     * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
     * let a = c.find(entry => entry === "A");
     */
    find(condition: Function): any;
    /**
     * Filter the Collection, returning an Array of entries which match a functional condition.
     * @see {Array#filter}
     * @param {Function} condition  The functional condition to test
     * @return {Array<*>}           An Array of matched values
     *
     * @example
     * let c = new Collection([["a", "AA"], ["b", "AB"], ["c", "CC"]]);
     * let hasA = c.filters(entry => entry.slice(0) === "A");
     */
    filter(condition: Function): Array<any>;
    /**
     * Get an entry from the Collection by name.
     * Use of this method assumes that the objects stored in the collection have a "name" attribute.
     * @param {string} name       The name of the entry to retrieve
     * @param {object} [options]  Additional options that affect how entries are retrieved
     * @param {boolean} [options.strict=false] Throw an Error if the requested name does not exist. Default false.
     * @return {*}                The retrieved entry value, if one was found, otherwise undefined
     *
     * @example
     * let c = new Collection([["a", "Alfred"], ["b", "Bob"], ["c", "Cynthia"]]);
     * c.getName("Alfred"); // "Alfred"
     * c.getName("D"); // undefined
     * c.getName("D", {strict: true}); // throws Error
     */
    getName(
      name: string,
      {
        strict,
      }?: {
        strict: boolean;
      },
    ): any;
    /**
     * Transform each element of the Collection into a new form, returning an Array of transformed values
     * @param {Function} transformer  The transformation function to apply to each entry value
     * @return {Array<*>}             An Array of transformed values
     */
    map(transformer: Function): Array<any>;
    /**
     * Reduce the Collection by applying an evaluator function and accumulating entries
     * @see {Array#reduce}
     * @param {Function} evaluator    A function which mutates the accumulator each iteration
     * @param {any} initial           An initial value which accumulates with each iteration
     * @return {any}                  The accumulated result
     *
     * @example
     * let c = new Collection([["a", "A"], ["b", "B"], ["c", "C"]]);
     * let letters = c.reduce((s, l) => {
     *   return s + l;
     * }, ""); // "ABC"
     */
    reduce(evaluator: Function, initial: any): any;
    /**
     * Test whether a condition is met by some entry in the Collection
     * @see {Array#some}
     * @param {Function} condition        A test condition to apply to each entry
     * @return {boolean}                  Was the test condition passed by at least one entry?
     */
    some(condition: Function): boolean;
    /**
     * Convert the Collection to a primitive array of its contents.
     * @returns {object[]}      An array of contained values
     */
    toJSON(): object[];
  }
}
declare module 'common/abstract/embedded-collection' {
  export default EmbeddedCollection;
  /**
   * An extension of the Collection.
   * Used for the specific task of containing embedded Document instances within a parent Document.
   * @param {object[]} sourceArray      The source data array for the collection in the parent Document data
   */
  class EmbeddedCollection<T> extends Collection<T> {
    constructor(sourceArray: any, documentClass: any);
    _source: any;
    documentClass: any;
    /**
     * Convert the EmbeddedCollection to an array of simple objects.
     * @param {boolean} [source=true]     Draw data for contained Documents from the underlying data source?
     * @returns {object[]}                The extracted array of primitive objects
     */
    toObject(source?: boolean): object[];
  }
  import Collection from 'common/utils/collection';
}
declare module 'common/abstract/data' {
  export default DocumentData;
  /**
   * A schema entry which describes a field of DocumentData
   */
  export type DocumentField = {
    /**
     * An object which defines the data type of this field
     */
    type: any;
    /**
     * Is this field required to have an assigned value? Default is false.
     */
    required: boolean;
    /**
     * Can the field be populated by a null value? Default is true.
     */
    nullable?: boolean;
    /**
     * A static default value or a function which assigns a default value
     */
    default?: Function | any;
    collection?: boolean;
    /**
     * An optional cleaning function which sanitizes input data to this field
     */
    clean?: Function;
    /**
     * A function which asserts that the value of this field is valid
     */
    validate?: Function;
    /**
     * An error message which is displayed if validation fails
     */
    validationError?: string;
    /**
     * Is the field an embedded Document collection?
     */
    isCollection?: boolean;
  };
  /**
   * The schema of a Document
   */
  export type DocumentSchema = any;
  /**
   * A schema entry which describes a field of DocumentData
   * @typedef {Object} DocumentField
   * @property {*} type                 An object which defines the data type of this field
   * @property {boolean} required       Is this field required to have an assigned value? Default is false.
   * @property {boolean} [nullable]     Can the field be populated by a null value? Default is true.
   * @property {Function|*} [default]   A static default value or a function which assigns a default value
   * @property {boolean} [collection]
   * @property {Function} [clean]       An optional cleaning function which sanitizes input data to this field
   * @property {Function} [validate]    A function which asserts that the value of this field is valid
   * @property {string} [validationError] An error message which is displayed if validation fails
   * @property {boolean} [isCollection] Is the field an embedded Document collection?
   */
  /**
   * The schema of a Document
   * @typedef {Object<DocumentField>}   DocumentSchema
   */
  /**
   * An abstract pattern for a data object which is contained within every type of Document.
   * @param {object} [data={}]        Initial data used to construct the data object
   * @param {Document} [document]     The document to which this data object belongs
   * @abstract
   * @interface
   * @memberof abstract
   */
  class DocumentData {
    /**
     * Define the data schema for documents of this type.
     * The schema is populated the first time it is accessed and cached for future reuse.
     * @returns {DocumentSchema}
     */
    static defineSchema(): DocumentSchema;
    /**
     * Define the data schema for documents of this type.
     * @type {DocumentSchema}
     */
    static get schema(): any;
    /**
     * Get the default value for a schema field, conditional on the provided data
     * @param {DocumentField} field   The configured data field
     * @param {object} data           The provided data object
     * @returns {undefined|*}         The default value for the field
     * @protected
     */
    protected static _getFieldDefaultValue(
      field: DocumentField,
      data: object,
    ): undefined | any;
    /**
     * Create a DocumentData instance using a provided serialized JSON string.
     * @param {string} json       Serialized document data in string format
     * @returns {DocumentData}    A constructed data instance
     */
    static frojsON(json: string): DocumentData;
    constructor(data?: {}, document?: any);
    /**
     * The primary identifier for the Document to which this data object applies.
     * This identifier is unique within the parent collection which contains the Document.
     * @type {string|null}
     * @protected
     */
    protected _id: string | null;
    /**
     * Define the data schema for this document instance.
     * @alias {DocumentData.schema}
     * @type {DocumentSchema}
     */
    get schema(): any;
    /**
     * Initialize the source data object in-place
     * @param {object} data
     * @returns {object}
     * @protected
     */
    protected _initializeSource(data: object): object;
    /**
     * Initialize the instance by copying data from the source object to instance attributes.
     * @protected
     */
    protected _initialize(): void;
    /**
     * Initialize the value for a given data type
     * @param {*} type    The type of the data field
     * @param {*} value   The un-initialized value
     * @returns {*}       The initialized value
     * @protected
     */
    protected _initializeType(type: any, value: any): any;
    /**
     * Validate the data contained in the document to check for type and content
     * This function throws an error if data within the document is not valid
     *
     * @param {object} options          Optional parameters which customize how validation occurs.
     * @param {object} [options.changes]    Only validate the keys of an object that was changed.
     * @param {boolean} [options.children]  Validate the data of child embedded documents? Default is true.
     * @param {boolean} [options.clean]     Apply field-specific cleaning functions to the provided value.
     * @param {boolean} [options.replace]   Replace any invalid values with valid defaults? Default is false.
     * @param {boolean} [options.strict]    If strict, will throw errors for any invalid data. Default is false.
     * @return {boolean}                An indicator for whether or not the document contains valid data
     */
    validate({
      changes,
      children,
      clean,
      replace,
      strict,
    }?: {
      changes: object;
      children: boolean;
      clean: boolean;
      replace: boolean;
      strict: boolean;
    }): boolean;
    /**
     * Build and return the error message for a Missing Field
     * @param {string} name             The named field that is missing
     * @param {DocumentField} field     The configured DocumentField from the Schema
     * @returns {string}                The error message
     * @protected
     */
    protected _getMissingFieldErrorMessage(
      name: string,
      field: DocumentField,
    ): string;
    /**
     * Build and return the error message for an Invalid Field Value
     * @param {string} name             The named field that is invalid
     * @param {DocumentField} field     The configured DocumentField from the Schema
     * @param value                     The value that is invalid
     * @returns {string}                The error message
     * @protected
     */
    protected _getInvalidFieldValueErrorMessage(
      name: string,
      field: DocumentField,
      value: any,
    ): string;
    /**
     * Validate a single field in the data object.
     * Assert that required fields are present and that each value passes it's validator function if one is provided.
     * @param {string} name             The named field being validated
     * @param {DocumentField} field     The configured DocumentField from the Schema
     * @param {*} value                 The current field value
     * @param {boolean} [children]      Validate the data of child embedded documents? Default is true.
     * @protected
     */
    protected _validateField(
      name: string,
      field: DocumentField,
      value: any,
      { children }?: { children: boolean },
    ): any;
    /**
     * Jointly validate the overall document after each field has been individually validated.
     * Throw an Error if any issue is encountered.
     * @protected
     */
    protected _validateDocument(): void;
    /**
     * Reset the state of this data instance back to mirror the contained source data, erasing any changes.
     */
    reset(): void;
    /**
     * Update the data by applying a new data object. Data is compared against and merged with the existing data.
     * Updating data which already exists is strict - it must pass validation or else the update is rejected.
     * An object is returned which documents the set of changes which were applied to the original data.
     * @see utils.mergeObject
     * @param {object} data     New values with which to update the Data object
     * @param {object} options  Options which determine how the new data is merged
     * @returns {object}        The changed keys and values which are different than the previous data
     */
    update(data?: object, options?: object): object;
    /**
     * Update an EmbeddedCollection using an array of provided document data
     * @param {EmbeddedCollection} collection       The EmbeddedCollection to update
     * @param {DocumentData[]} documentData         An array of provided Document data
     * @param {object} [options={}]                 Additional options which modify how the collection is updated
     */
    updateCollection<T extends DocumentData>(
      collection: EmbeddedCollection<T>,
      documentData: T[],
      options?: object,
    ): void;
    /**
     * Copy and transform the DocumentData into a plain object.
     * Draw the values of the extracted object from the data source (by default) otherwise from its transformed values.
     * @param {boolean} [source=true]     Draw values from the underlying data source rather than transformed values
     * @returns {object}                  The extracted primitive object
     */
    toObject(source?: boolean): object;
    /**
     * Extract the source data for the DocumentData into a simple object format that can be serialized.
     * @returns {object}          The document source data expressed as a plain object
     */
    toJSON(): object;
  }
  import EmbeddedCollection from 'common/abstract/embedded-collection';
}
declare module 'common/abstract/module' {
  export { default as DatabaseBackend } from 'common/abstract/backend';
  export { default as DocumentData } from 'common/abstract/data';
  export { default as Document } from 'common/abstract/document';
}
declare module 'common/data/validators' {
  /**
   * Test whether a string is a valid 16 character UID
   * @param {string|null} id
   * @return {boolean}
   */
  export function isValidId(id: string | null): boolean;
  /**r
   * Test whether a file path has an extension in a list of provided extensions
   * @param {string} path
   * @param {string[]} extensions
   * @return {boolean}
   * @private
   */
  export function _hasFileExtension(
    path: string,
    extensions: string[],
  ): boolean;
  /**
   * Test whether a file path has a valid image file extension or is base64 PNG data
   * @param {String} path     The image path to test
   * @return {boolean}        Is the path valid?
   */
  export function hasImageExtension(path: string): boolean;
  /**
   * Test whether a data blob represents a base64 image
   * @param {string} data       A base64 data string
   * @return {boolean}          Is it a base64 image?
   */
  export function isBase64Image(data: string): boolean;
  /**
   * Test whether an input represents a valid 6-character color string
   * @param {string} color      The input string to test
   * @return {boolean}          Is the string a valid color?
   */
  export function isColorString(color: string): boolean;
  /**
   * Test whether a file path has a valid audio file extension
   * @param {string} path       The image path to test
   * @return {boolean}          Is the path valid?
   */
  export function hasVideoExtension(path: string): boolean;
  /**
   * Test whether a file path has a valid video file extension
   * @param {string} path       The image path to test
   * @return {boolean}          Is the path valid?
   */
  export function hasAudioExtension(path: string): boolean;
  /**
   * Assert that the given value is in an array of allowed options
   * @param {any} val           The value to test
   * @param {any[]} array       The set of allowed options
   * @return {boolean}          Is the valid included?
   */
  export function valueInArray(val: any, array: any[]): boolean;
  /**
   * Assert that the given value parses as a valid JSON string
   * @param {string} val        The value to test
   * @return {boolean}          Is the String valid JSON?
   */
  export function isJSON(val: string): boolean;
}
declare module 'common/data/fields' {
  /**
   * Create a foreign key field which references a primary Document id
   * @returns {DocumentField}
   */
  export function foreignDocumentField(options: any): any;
  /**
   * Create a special field which contains a Collection of embedded Documents
   * @param {Function} document       The Document class definition
   * @param {object} [options={}]     Additional field options
   * @returns {DocumentField}
   */
  export function embeddedCollectionField(
    document: Function,
    options?: object,
  ): any;
  /**
   * Return a document field which is a modification of a static field type
   * @returns {DocumentField}
   */
  export function field(field: any, options?: {}): any;
  /**
   * A required boolean field which may be used in a Document.
   * @type {DocumentField}
   */
  export const BOOLEAN_FIELD: any;
  /**
   * A standard string color field which may be used in a Document.
   * @type {DocumentField}
   */
  export const COLOR_FIELD: any;
  /**
   * A standard string field for an image file path which may be used in a Document.
   * @type {DocumentField}
   */
  export const IMAGE_FIELD: any;
  /**
   * A standard string field for a video or image file path may be used in a Document.
   * @type {DocumentField}
   */
  export const VIDEO_FIELD: any;
  /**
   * A standard string field for an audio file path which may be used in a Document.
   * @type {DocumentField}
   */
  export const AUDIO_FIELD: any;
  /**
   * A standard integer field which may be used in a Document.
   * @type {DocumentField}
   */
  export const INTEGER_FIELD: any;
  /**
   * A string field which contains serialized JSON data that may be used in a Document.
   * @type {DocumentField}
   */
  export const JSON_FIELD: any;
  /**
   * A non-negative integer field which may be used in a Document.
   * @type {DocumentField}
   */
  export const NONNEGATIVE_INTEGER_FIELD: any;
  /**
   * A non-negative integer field which may be used in a Document.
   * @type {DocumentField}
   */
  export const POSITIVE_INTEGER_FIELD: any;
  /**
   * A template for a required inner-object field which may be used in a Document.
   * @type {DocumentField}
   */
  export const OBJECT_FIELD: any;
  /**
   * An optional string field which may be included by a Document.
   * @type {DocumentField}
   */
  export const STRING_FIELD: any;
  /**
   * An optional numeric field which may be included in a Document.
   * @type {DocumentField}
   */
  export const NUMERIC_FIELD: any;
  /**
   * A required numeric field which may be included in a Document and may not be null.
   * @type {DocumentField}
   */
  export const REQUIRED_NUMBER: any;
  /**
   * A required numeric field which must be a positive finite value that may be included in a Document.
   * @type {DocumentField}
   */
  export const REQUIRED_POSITIVE_NUMBER: any;
  /**
   * A required numeric field which represents an angle of rotation in degrees between 0 and 360.
   * @type {DocumentField}
   */
  export const ANGLE_FIELD: any;
  /**
   * A required numeric field which represents a uniform number between 0 and 1.
   * @type {DocumentField}
   */
  export const ALPHA_FIELD: any;
  /**
   * A string field which requires a non-blank value and may not be null.
   * @type {DocumentField}
   */
  export const REQUIRED_STRING: any;
  /**
   * A string field which is required, but may be left blank as an empty string.
   * @type {DocumentField}
   */
  export const BLANK_STRING: any;
  /**
   * A field used for integer sorting of a Document relative to its siblings
   * @type {DocumentField}
   */
  export const INTEGER_SORT_FIELD: any;
  /**
   * A numeric timestamp field which may be used in a Document.
   * @type {DocumentField}
   */
  export const TIMESTAMP_FIELD: any;
  /**
   * The standard identifier for a Document.
   * @type {DocumentField}
   */
  export const DOCUMENT_ID: any;
  /**
   * The standard permissions object which may be included by a Document.
   * @type {DocumentField}
   */
  export const DOCUMENT_PERMISSIONS: any;
}
declare module 'common/data/data' {
  /**
   * The data schema for a ActiveEffect document.
   * @extends DocumentData
   * @memberof data
   * @see BaseActiveEffect
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseActiveEffect} [document]   The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies the ActiveEffect within a parent Actor or Item
   * @property {string} label               A text label which describes the name of the ActiveEffect
   * @property {data.EffectChangeData[]} changes    The array of EffectChangeData objects which the ActiveEffect applies
   * @property {boolean} [disabled=false]   Is this ActiveEffect currently disabled?
   * @property {data.EffectDurationData} [duration]  An EffectDurationData object which describes the duration of the ActiveEffect
   * @property {string} [icon]              An icon image path used to depict the ActiveEffect
   * @property {string} [origin]            A UUID reference to the document from which this ActiveEffect originated
   * @property {string} [tint=null]         A color string which applies a tint to the ActiveEffect icon
   * @property {boolean} [transfer=false]   Does this ActiveEffect automatically transfer from an Item to an Actor?
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class ActiveEffectData extends DocumentData {
    static defineSchema(): {
      _id: any;
      changes: {
        type: typeof EffectChangeData[];
        required: boolean;
        default: any[];
      };
      disabled: any;
      duration: {
        type: typeof EffectDurationData;
        required: boolean;
        default: {};
      };
      icon: any;
      label: any;
      origin: any;
      tint: any;
      transfer: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Actor document.
   * @extends DocumentData
   * @memberof data
   * @see BaseActor
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseActor} [document]   The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this Actor document
   * @property {string} name                The name of this Actor
   * @property {string} type                An Actor subtype which configures the system data model applied
   * @property {string} [img]               An image file path which provides the artwork for this Actor
   * @property {object} [data]              The system data object which is defined by the system template.json model
   * @property {data.PrototypeTokenData} [token] Default Token settings which are used for Tokens created from this Actor
   * @property {Collection<BaseItem>} items A Collection of Item embedded Documents
   * @property {Collection<BaseActiveEffect>} effects A Collection of ActiveEffect embedded Documents
   * @property {string|null} folder         The _id of a Folder which contains this Actor
   * @property {number} [sort]              The numeric sort value which orders this Actor relative to its siblings
   * @property {object} [permission]        An object which configures user permissions to this Actor
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class ActorData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      type: {
        type: StringConstructor;
        required: boolean;
        validate: (t: any) => any;
        validationError: string;
      };
      img: any;
      data: any;
      token: {
        type: typeof PrototypeTokenData;
        required: boolean;
        default: (data: any) => {
          name: any;
          img: any;
        };
      };
      items: any;
      effects: any;
      folder: any;
      sort: any;
      permission: any;
      flags: any;
    };
    /**
     * The default icon used for newly created Macro documents
     * @type {string}
     */
    static DEFAULT_ICON: string;
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a AmbientLight embedded document.
   * @extends DocumentData
   * @memberof data
   * @see BaseAmbientLight
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseAmbientLight} [document]           The embedded document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this BaseAmbientLight embedded document
   * @property {string} [t=l]               The source type in CONST.SOURCE_TYPES which defines the behavior of this light
   * @property {number} [x=0]               The x-coordinate position of the origin of the light
   * @property {number} [y=0]               The y-coordinate position of the origin of the light
   * @property {number} [rotation=0]        The angle of rotation for the tile between 0 and 360
   * @property {number} [dim=0]             The radius of dim light emitted in distance units, negative values produce darkness
   * @property {number} [bright=0]          The radius of bright light emitted in distance units, negative values produce blackness
   * @property {number} [angle=360]         The angle of emission of the light source in degrees
   * @property {string} [tintColor]         An optional color string which applies coloration to the resulting light source
   * @property {number} [tintAlpha=0.5]     The intensity of coloration applied to this light source, a number between 0 and 1
   * @property {data.AnimationData} [lightAnimation] A data object which configures token light animation settings, if one is applied
   * @property {number} [darknessThreshold=0] A value of the Scene darkness level, above which this light source will be active
   * @property {boolean} [hidden=false]     Is the light source currently hidden?
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class AmbientLightData extends DocumentData {
    static defineSchema(): {
      _id: any;
      t: {
        type: StringConstructor;
        required: boolean;
        default: string;
        validate: (t: any) => boolean;
        validationError: string;
      };
      x: any;
      y: any;
      rotation: any;
      dim: any;
      bright: any;
      angle: any;
      tintColor: any;
      tintAlpha: any;
      lightAnimation: {
        type: typeof AnimationData;
        required: boolean;
        default: {};
      };
      darknessThreshold: any;
      darkness: {
        type: typeof DarknessActivation;
        required: boolean;
        default: {};
      };
      hidden: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
    x: any;
    y: any;
    dim: any;
    bright: any;
  }
  /**
   * The data schema for a AmbientSound embedded document.
   * @extends DocumentData
   * @memberof data
   * @see BaseAmbientSound
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseAmbientSound} [document]   The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this AmbientSound document
   * @property {string} name                The name of this sound track
   * @property {string} path                The audio file path that is played by this sound
   * @property {boolean} [playing=false]    Is this sound currently playing?
   * @property {boolean} [repeat=false]     Does this sound loop?
   * @property {number} [volume=0.5]        The audio volume of the sound, from 0 to 1
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class AmbientSoundData extends DocumentData {
    static defineSchema(): {
      _id: any;
      type: {
        type: StringConstructor;
        required: boolean;
        default: any;
        validate: (t: any) => any;
        validationError: string;
      };
      x: any;
      y: any;
      radius: any;
      path: any;
      repeat: any;
      volume: any;
      easing: any;
      hidden: any;
      darkness: {
        type: typeof DarknessActivation;
        required: boolean;
        default: {};
      };
      flags: any;
    };
    constructor(data?: {}, document?: any);
    x: any;
    y: any;
    radius: any;
    volume: any;
  }
  /**
   * The data schema for a Combat document.
   * @extends DocumentData
   * @memberof data
   * @see BaseCombat
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseCombat} [document]         The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this Combat document
   * @property {string} scene               The _id of a Scene within which this Combat occurs
   * @property {Collection<BaseCombatant>} combatants A Collection of Combatant embedded Documents
   * @property {boolean} [active=false]     Is the Combat encounter currently active?
   * @property {number} [round=0]           The current round of the Combat encounter
   * @property {number} [turn=0]            The current turn in the Combat round
   * @property {number] [sort=0]            The current sort order of this Combat relative to others in the same Scene
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class CombatData extends DocumentData {
    static defineSchema(): {
      _id: any;
      scene: any;
      combatants: any;
      active: any;
      round: any;
      turn: any;
      sort: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Combatant embedded document within a CombatEncounter document.
   * @extends DocumentData
   * @memberof data
   * @see BaseCombatant
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseCombatant} [document]      The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this Combatant embedded document
   * @property {string} [tokenId]           The _id of a Token associated with this Combatant
   * @property {string} [name]              A customized name which replaces the name of the Token in the tracker
   * @property {string} [img]               A customized image which replaces the Token image in the tracker
   * @property {number} [initiative]        The initiative score for the Combatant which determines its turn order
   * @property {boolean} [hidden=false]     Is this Combatant currently hidden?
   * @property {boolean} [defeated=false]   Has this Combatant been defeated?
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class CombatantData extends DocumentData {
    static defineSchema(): {
      _id: any;
      actorId: any;
      tokenId: any;
      name: any;
      img: any;
      initiative: any;
      hidden: any;
      defeated: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a ChatMessage document.
   * @extends DocumentData
   * @memberof data
   * @see BaseChatMessage
   *
   * @param {object} data                 Initial data used to construct the data object
   * @param {BaseChatMessage} [document]  The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this ChatMessage document
   * @property {number} [type=0]            The message type from CONST.CHAT_MESSAGE_TYPES
   * @property {string} user                The _id of the User document who generated this message
   * @property {number} timestamp           The timestamp at which point this message was generated
   * @property {string} [flavor]            An optional flavor text message which summarizes this message
   * @property {string} content             The HTML content of this chat message
   * @property {data.ChatSpeakerData} speaker A ChatSpeakerData object which describes the origin of the ChatMessage
   * @property {string[]} whisper           An array of User _id values to whom this message is privately whispered
   * @property {boolean} [blind=false]      Is this message sent blindly where the creating User cannot see it?
   * @property {string} [roll]              The serialized content of a Roll instance which belongs to the ChatMessage
   * @property {string} [sound]             The URL of an audio file which plays when this message is received
   * @property {boolean} [emote=false]      Is this message styled as an emote?
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class ChatMessageData extends DocumentData {
    static defineSchema(): {
      _id: any;
      type: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: typeof _validateChatMessageType;
        validationError: string;
      };
      user: any;
      timestamp: any;
      flavor: any;
      content: any;
      speaker: {
        type: typeof ChatSpeakerData;
        required: boolean;
        default: {};
      };
      whisper: {
        type: StringConstructor[];
        clean: (users: any) => any;
        required: boolean;
        default: any[];
      };
      blind: any;
      roll: any;
      sound: any;
      emote: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Drawing embedded document.
   * @extends DocumentData
   * @memberof data
   * @see BaseDrawing
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseDrawing} [document]        The embedded document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this BaseDrawing embedded document
   * @property {string} t                   The value in CONST.DRAWING_TYPES which defines the geometry type of this drawing
   * @property {number} x                   The x-coordinate position of the top-left corner of the drawn shape
   * @property {number} y                   The y-coordinate position of the top-left corner of the drawn shape
   * @property {number} width               The pixel width of the drawing figure
   * @property {number} height              The pixel height of the drawing figure
   * @property {number} [rotation=0]        The angle of rotation for the drawing figure
   * @property {number} [z=0]               The z-index of this drawing relative to other siblings
   * @property {Array<number[]>} [points]   An array of points [x,y] which define polygon vertices
   * @property {number} [bezierFactor=0]    An amount of bezier smoothing applied, between 0 and 1
   * @property {number} [fillType=0]        The fill type of the drawing shape, a value from CONST.DRAWING_FILL_TYPES
   * @property {string} [fillColor]         An optional color string with which to fill the drawing geometry
   * @property {number} [fillAlpha=0.5]     The opacity of the fill applied to the drawing geometry
   * @property {number} [strokeWidth=8]     The width in pixels of the boundary lines of the drawing geometry
   * @property {number} [strokeColor]       The color of the boundary lines of the drawing geometry
   * @property {number} [strokeAlpha=1]     The opacity of the boundary lines of the drawing geometry
   * @property {string} [texture]           The path to a tiling image texture used to fill the drawing geometry
   * @property {string} [text]              Optional text which is displayed overtop of the drawing
   * @property {string} [fontFamily=Signika] The font family used to display text within this drawing
   * @property {number} [fontSize=48]       The font size used to display text within this drawing
   * @property {string} [textColor=#FFFFFF] The color of text displayed within this drawing
   * @property {number} [textAlpha=1]       The opacity of text displayed within this drawing
   * @property {boolean} [hidden=false]     Is the drawing currently hidden?
   * @property {boolean} [locked=false]     Is the drawing currently locked?
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class DrawingData extends DocumentData {
    static defineSchema(): {
      _id: any;
      author: any;
      type: {
        type: StringConstructor;
        required: boolean;
        default: string;
        validate: (t: any) => boolean;
        validationError: string;
      };
      x: any;
      y: any;
      width: any;
      height: any;
      rotation: any;
      z: any;
      points: {
        type: ArrayConstructor[];
        required: boolean;
        default: any[];
        validate: typeof _validateDrawingPoints;
        validationError: string;
      };
      bezierFactor: any;
      fillType: any;
      fillColor: any;
      fillAlpha: any;
      strokeWidth: any;
      strokeColor: any;
      strokeAlpha: any;
      texture: any;
      text: any;
      fontFamily: any;
      fontSize: any;
      textColor: any;
      textAlpha: any;
      hidden: any;
      locked: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
    x: any;
    y: any;
  }
  /**
   * The data schema for a FogExploration document.
   * @extends DocumentData
   * @memberof data
   * @see BaseFogExploration
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseFogExploration} [document] The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this FogExploration document
   * @property {string} scene               The _id of the Scene document to which this fog applies
   * @property {string} user                The _id of the User document to which this fog applies
   * @property {string} explored            The base64 png image of the explored fog polygon
   * @property {object} positions           The object of scene positions which have been explored at a certain vision radius
   * @property {number} timestamp           The timestamp at which this fog exploration was last updated
   */
  export class FogExplorationData extends DocumentData {
    static defineSchema(): {
      _id: any;
      scene: any;
      user: any;
      explored: {
        type: StringConstructor;
        required: boolean;
        nullable: boolean;
        default: any;
        validate: typeof isBase64Image;
        validationError: string;
      };
      positions: any;
      timestamp: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Folder document.
   * @extends DocumentData
   * @memberof data
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseFolder} [document]         The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this Folder document
   * @property {string} name                The name of this Folder
   * @property {string} type                The document type which this Folder contains, from CONST.FOLDER_ENTITY_TYPES
   * @property {string} [description]       An HTML description of the contents of this folder
   * @property {string|null} [parent]       The _id of a parent Folder which contains this Folder
   * @property {string} [sorting=a]         The sorting mode used to organize documents within this Folder, in ["a", "m"]
   * @property {number} [sort]              The numeric sort value which orders this Folder relative to its siblings
   * @property {string|null} [color]        A color string used for the background color of this Folder
   * @property {object} [flags={}]          An object of optional key/value flags
   *
   */
  export class FolderData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      type: {
        type: StringConstructor;
        required: boolean;
        validate: (t: any) => boolean;
        validationError: string;
      };
      description: any;
      parent: any;
      sorting: {
        type: StringConstructor;
        required: boolean;
        default: string;
        validate: (mode: any) => boolean;
        validationError: string;
      };
      sort: any;
      color: any;
      flags: any;
    };
    static SORTING_MODES: string[];
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Item document.
   * @extends DocumentData
   * @memberof data
   * @see BaseItem
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseItem} [document]           The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this Item document
   * @property {string} name                The name of this Item
   * @property {string} type                An Item subtype which configures the system data model applied
   * @property {string} [img]               An image file path which provides the artwork for this Item
   * @property {object} [data]              The system data object which is defined by the system template.json model
   * @property {Collection<BaseActiveEffect>} effects A collection of ActiveEffect embedded Documents
   * @property {string|null} folder         The _id of a Folder which contains this Item
   * @property {number} [sort]              The numeric sort value which orders this Item relative to its siblings
   * @property {object} [permission]        An object which configures user permissions to this Item
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class ItemData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      type: {
        type: StringConstructor;
        required: boolean;
        validate: (t: any) => any;
        validationError: string;
      };
      img: any;
      data: any;
      effects: any;
      folder: any;
      sort: any;
      permission: any;
      flags: any;
    };
    /**
     * The default icon used for newly created Item documents
     * @type {string}
     */
    static DEFAULT_ICON: string;
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a JournalEntry document.
   * @extends DocumentData
   * @memberof data
   * @see BaseJournalEntry
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseJournalEntry} [document]   The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this JournalEntry document
   * @property {string} name                The name of this JournalEntry
   * @property {string} content             The HTML content of the JournalEntry
   * @property {string|null} [img]          An image file path which provides the artwork for this JournalEntry
   * @property {string|null} folder         The _id of a Folder which contains this JournalEntry
   * @property {number} [sort]              The numeric sort value which orders this JournalEntry relative to its siblings
   * @property {object} [permission]        An object which configures user permissions to this JournalEntry
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class JournalEntryData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      content: any;
      img: any;
      folder: any;
      sort: any;
      permission: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Macro document.
   * @extends DocumentData
   * @memberof data
   * @see BaseMacro
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseMacro} [document]          The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this Macro document
   * @property {string} name                The name of this Macro
   * @property {string} type                A Macro subtype from CONST.MACRO_TYPES
   * @property {string} author              The _id of a User document which created this Macro *
   * @property {string} [img]               An image file path which provides the thumbnail artwork for this Macro
   * @property {string} [scope=global]      The scope of this Macro application from CONST.MACRO_SCOPES
   * @property {string} command             The string content of the macro command
   * @property {string|null} folder         The _id of a Folder which contains this Macro
   * @property {number} [sort]              The numeric sort value which orders this Macro relative to its siblings
   * @property {object} [permission]        An object which configures user permissions to this Macro
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class MacroData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      type: {
        type: StringConstructor;
        required: boolean;
        default: string;
        validate: (t: any) => boolean;
        validationError: string;
      };
      author: any;
      img: any;
      scope: {
        type: StringConstructor;
        required: boolean;
        default: string;
        validate: (t: any) => boolean;
        validationError: string;
      };
      command: any;
      folder: any;
      sort: any;
      permission: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a MeasuredTemplate embedded document.
   * @extends DocumentData
   * @memberof data
   * @see BaseMeasuredTemplate
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseMeasuredTemplate} [document] The embedded document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this BaseMeasuredTemplate embedded document
   * @property {string} [t=circle]          The value in CONST.MEASURED_TEMPLATE_TYPES which defines the geometry type of this template
   * @property {number} [x=0]               The x-coordinate position of the origin of the template effect
   * @property {number} [y=0]               The y-coordinate position of the origin of the template effect
   * @property {number} [distance]          The distance of the template effect
   * @property {number} [direction=0]       The angle of rotation for the measured template
   * @property {number} [angle=360]         The angle of effect of the measured template, applies to cone types
   * @property {number} [width]             The width of the measured template, applies to ray types
   * @property {string} [borderColor=#000000] A color string used to tint the border of the template shape
   * @property {string} [fillColor=#FF0000] A color string used to tint the fill of the template shape
   * @property {string} [texture]           A repeatable tiling texture used to add a texture fill to the template shape
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class MeasuredTemplateData extends DocumentData {
    static defineSchema(): {
      _id: any;
      user: any;
      t: {
        type: StringConstructor;
        required: boolean;
        default: string;
        validate: (t: any) => boolean;
        validationError: string;
      };
      x: any;
      y: any;
      distance: any;
      direction: any;
      angle: any;
      width: any;
      borderColor: any;
      fillColor: any;
      texture: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
    x: any;
    y: any;
  }
  /**
   * The data schema for a Note embedded document.
   * @extends DocumentData
   * @memberof data
   * @see BaseNote
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseNote} [document]           The embedded document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this BaseNote embedded document
   * @property {string|null} [entryId=null] The _id of a JournalEntry document which this Note represents
   * @property {number} [x=0]               The x-coordinate position of the center of the note icon
   * @property {number} [y=0]               The y-coordinate position of the center of the note icon
   * @property {string} [icon]              An image icon path used to represent this note
   * @property {number} [iconSize=40]       The pixel size of the map note icon
   * @property {string} [iconTint]          An optional color string used to tint the map note icon
   * @property {string} [text]              Optional text which overrides the title of the linked Journal Entry
   * @property {string} [fontFamily=Signika] The font family used to display the text label on this note
   * @property {number} [fontSize=36]       The font size used to display the text label on this note
   * @property {number} [textAnchor=1]      A value in CONST.TEXT_ANCHOR_POINTS which defines where the text label anchors
   *                                        to the note icon.
   * @property {string} [textColor=#FFFFFF] The string that defines the color with which the note text is rendered
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class NoteData extends DocumentData {
    static defineSchema(): {
      _id: any;
      entryId: any;
      x: any;
      y: any;
      icon: any;
      iconSize: any;
      iconTint: any;
      text: any;
      fontFamily: any;
      fontSize: any;
      textAnchor: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (p: any) => boolean;
        validationError: string;
      };
      textColor: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Playlist document.
   * @extends DocumentData
   * @memberof data
   * @see BasePlaylist
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BasePlaylist} [document]       The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this Playlist document
   * @property {string} name                The name of this playlist
   * @property {Collection<BasePlaylistSound>} sounds A Collection of PlaylistSounds embedded documents which belong to this playlist
   * @property {number} [mode=0]            The playback mode for sounds in this playlist
   * @property {boolean} [playing=false]    Is this playlist currently playing?
   * @property {string|null} folder         The _id of a Folder which contains this playlist
   * @property {number} [sort]              The numeric sort value which orders this playlist relative to its siblings
   * @property {object} [permission]        An object which configures user permissions to this playlist
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class PlaylistData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      description: any;
      sounds: any;
      mode: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (m: any) => boolean;
        validationError: string;
      };
      playing: any;
      fade: any;
      folder: any;
      sort: any;
      seed: any;
      permission: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a PlaylistSound embedded document.
   * @extends DocumentData
   * @memberof data
   * @see BasePlaylistSound
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BasePlaylistSound} [document]   The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this PlaylistSound document
   * @property {string} name                The name of this sound track
   * @property {string} path                The audio file path that is played by this sound
   * @property {boolean} [playing=false]    Is this sound currently playing?
   * @property {boolean} [repeat=false]     Does this sound loop?
   * @property {number} [volume=0.5]        The audio volume of the sound, from 0 to 1
   * @property {boolean} [streaming=false]  Does this audio file use the "large file streaming" mode?
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class PlaylistSoundData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      description: any;
      path: any;
      playing: any;
      pausedTime: any;
      repeat: any;
      volume: any;
      fade: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
    volume: any;
  }
  /**
   * Extend the base TokenData to define a PrototypeToken which exists within a parent Actor.
   * @extends {DocumentData}
   * @see ActorData
   * @memberof data
   *
   * @property {string} _id                 The Token _id which uniquely identifies it within its parent Scene
   * @property {string} name                The name used to describe the Token
   * @property {number} [displayName=0]     The display mode of the Token nameplate, from CONST.TOKEN_DISPLAY_MODES
   * @property {string|null} actorId        The _id of an Actor document which this Token represents
   * @property {boolean} [actorLink=false]  Does this Token uniquely represent a singular Actor, or is it one of many?
   * @property {string} img                 A file path to an image or video file used to depict the Token
   * @property {boolean} [randomImg=false]  Uses a random "wildcard" image path which is resolved with a Token is created
   * @property {string} [tint=null]         An optional color tint applied to the Token image
   * @property {number} [width=1]           The width of the Token in grid units
   * @property {number} [height=1]          The height of the Token in grid units
   * @property {number} [scale=1]           A scale factor applied to the Token image, between 0.25 and 3
   * @property {boolean} [mirrorX=false]    Flip the Token image horizontally?
   * @property {boolean} [mirrorY=false]    Flip the Token image vertically?
   * @property {boolean} [lockRotation=false]  Prevent the Token image from visually rotating?
   * @property {number} [rotation=0]        The rotation of the Token in degrees, from 0 to 360. A value of 0 represents a southward-facing Token.
   * @property {boolean} [vision]           Is this Token a source of vision?
   * @property {number} [dimSight=0]        How far in distance units the Token can naturally see as if in dim light
   * @property {number} [brightSight=0]     How far in distance units the Token can naturally see as if in bright light
   * @property {number} [sightAngle=360]    The angle at which this Token is able to see, if it has vision
   * @property {number} [dimLight=0]        How far in distance units this Token emits dim light
   * @property {number} [brightLight=0]     How far in distance units this Token emits bright light
   * @property {number} [lightAngle=360]    The angle at which this Token is able to emit light
   * @property {data.AnimationData} [lightAnimation] A data object which configures token light animation settings
   * @property {number} [disposition=-1]    A displayed Token disposition from CONST.TOKEN_DISPOSITIONS
   * @property {number} [displayBars=0]     The display mode of Token resource bars, from CONST.TOKEN_DISPLAY_MODES
   * @property {TokenBarData} [bar1]        The configuration of the Token's primary resource bar
   * @property {TokenBarData} [bar2]        The configuration of the Token's secondary resource bar
   */
  export class PrototypeTokenData extends DocumentData {
    static defineSchema(): {
      randomImg: any;
      img: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a RollTable document.
   * @extends DocumentData
   * @memberof data
   * @see BaseRollTable
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseRollTable} [document]      The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this RollTable document
   * @property {string} name                The name of this RollTable
   * @property {string} [img]               An image file path which provides the thumbnail artwork for this RollTable
   * @property {string} [description]       The HTML text description for this RollTable document
   * @property {Collection<BaseTableResult>} [results=[]] A Collection of TableResult embedded documents which belong to this RollTable
   * @property {string} formula             The Roll formula which determines the results chosen from the table
   * @property {boolean} [replacement=true] Are results from this table drawn with replacement?
   * @property {boolean} [displayRoll=true] Is the Roll result used to draw from this RollTable displayed in chat?
   * @property {string|null} folder         The _id of a Folder which contains this RollTable
   * @property {number} [sort]              The numeric sort value which orders this RollTable relative to its siblings
   * @property {object} [permission]        An object which configures user permissions to this RollTable
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class RollTableData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      img: any;
      description: any;
      results: any;
      formula: any;
      replacement: any;
      displayRoll: any;
      folder: any;
      sort: any;
      permission: any;
      flags: any;
    };
    /**
     * The default icon used for newly created Macro documents
     * @type {string}
     */
    static DEFAULT_ICON: string;
    constructor(data?: {}, document?: any);
  }
  /**
     * The data schema for a Scene document.
     * @extends DocumentData
     * @memberof data
     * @see BaseScene
     *
     * @param {object} data                   Initial data used to construct the data object
     * @param {BaseScene} [document]          The document to which this data object belongs
     *
     * @property {string} _id                 The _id which uniquely identifies this Scene document
     * @property {string} name                The name of this scene
     *
     * @property {boolean} [active=false]     Is this scene currently active? Only one scene may be active at a given time.
     * @property {boolean} [navigation=false] Is this scene displayed in the top navigation bar?
     * @property {number} [navOrder]          The integer sorting order of this Scene in the navigation bar relative to others
     * @property {string} [navName]           A string which overrides the canonical Scene name which is displayed in the navigation bar
     *
     * @property {string} [img]               An image or video file path which provides the background media for the scene
     * @property {string} [thumb]             A thumbnail image (base64) or file path which visually summarizes the scene
     * @property {number} [width=4000]        The width of the scene canvas, this should normally be the width of the background media
     * @property {number} [height=3000]       The height of the scene canvas, this should normally be the height of the background media
     * @property {number} [padding=0.25]      The proportion of canvas padding applied around the outside of the scene
     *                                        dimensions to provide additional buffer space
     * @property {{x: number, y: number, scale: number}|null} [initial=null] The initial view coordinates for the scene, or null
     * @property {string} [backgroundColor=#999999] The color of the canvas which is displayed behind the scene background
     *
     * @property {number} [gridType=1]        The type of grid used in this scene, a number from CONST.GRID_TYPES
     * @property {number} [grid=100]          The grid size which represents the width (or height) of a single grid space
     * @property {number} [shiftX=0]          A number of offset pixels that the background image is shifted horizontally relative to the grid
     * @property {number} [shiftY=0]          A number of offset pixels that the background image is shifted vertically relative to the grid
     * @property {string} [gridColor=#000000] A string representing the color used to render the grid lines
     * @property {number} [gridAlpha=0.2]     A number between 0 and 1 for the opacity of the grid lines
     * @property {number} [gridDistance]      The number of distance units which are represented by a single grid space.
     * @property {string} [gridUnits]         A label for the units of measure which are used for grid distance.
     *
     * @property {boolean} [tokenVision=true] Do Tokens require vision in order to see the Scene environment?
     * @property {boolean} [fogExploration=true] Should fog exploration progress be tracked for this Scene?
     * @property {number} [fogReset]          The timestamp at which fog of war was last reset for this Scene.
     * @property {boolean} [globalLight=false] Does this Scene benefit from global illumination which provides bright light everywhere?
     * @property {number} [darkness=0]        The ambient darkness level in this Scene, where 0 represents mid-day
     *                                        (maximum illumination) and 1 represents mid-night (maximum darkness)
     * @property {number} [globalLightThreshold] A darkness level between 0 and 1, beyond which point global illumination is
     *                                        temporarily disabled if globalLight is true.
     *
     * @property {Collection<BaseDrawing>} [drawings=[]]   A collection of embedded Drawing objects.
     * @property {Collection<BaseTile>} [tiles=[]]         A collection of embedded Tile objects.
     * @property {Collection<BaseToken>} [tokens=[]]       A collection of embedded Token objects.
     * @property {Collection<BaseAmbientLight>} [lights=[]] A collection of embedded AmbientLight objects.
     * @property {Collection<BaseNote>} [notes=[]]         A collection of embedded Note objects.
     * @property {Collection<BaseAmbientSound>} [sounds=[]] A collection of embedded AmbientSound objects.
     * @property {Collection<BaseMeasuredTemplate>} [templates=[]] A collection of embedded MeasuredTemplate objects.
     * @property {Collection<BaseWall>} [walls=[]]         A collection of embedded Wall objects
     *
     * @property {BasePlaylist} [playlist]    A linked Playlist document which should begin automatically playing when this
     *                                        Scene becomes active.
     * @property {JournalEntry} [journal]     A linked JournalEntry document which provides narrative details about this Scene.
     * @property {string} [weather]           A named weather effect which should be rendered in this Scene.
    
     * @property {string|null} folder         The _id of a Folder which contains this Actor
     * @property {number} [sort]              The numeric sort value which orders this Actor relative to its siblings
     * @property {object} [permission]        An object which configures user permissions to this Actor
     * @property {object} [flags={}]          An object of optional key/value flags
     */
  export class SceneData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      active: any;
      navigation: any;
      navOrder: any;
      navName: any;
      img: any;
      foreground: any;
      thumb: any;
      width: any;
      height: any;
      padding: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (p: any) => any;
        validation: string;
      };
      initial: {
        type: ObjectConstructor;
        required: boolean;
        nullable: boolean;
        default: any;
        validate: typeof _validateInitialViewPosition;
        validationError: string;
      };
      backgroundColor: any;
      gridType: any;
      grid: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (n: any) => boolean;
        validationError: string;
      };
      shiftX: any;
      shiftY: any;
      gridColor: any;
      gridAlpha: any;
      gridDistance: any;
      gridUnits: any;
      tokenVision: any;
      fogExploration: any;
      fogReset: any;
      globalLight: any;
      globalLightThreshold: {
        type: NumberConstructor;
        required: boolean;
        nullable: boolean;
        default: any;
        validate: (n: any) => any;
        validationError: string;
      };
      darkness: any;
      drawings: any;
      tokens: any;
      lights: any;
      notes: any;
      sounds: any;
      templates: any;
      tiles: any;
      walls: any;
      playlist: any;
      playlistSound: any;
      journal: any;
      weather: any;
      folder: any;
      sort: any;
      permission: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
    shiftX: any;
    shiftY: any;
    size: any;
  }
  /**
   * The data schema for a Setting document.
   * @extends DocumentData
   * @memberof data
   * @see BaseSetting
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseSetting} [document]        The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this Setting document
   * @property {string} key                 The setting key, a composite of {scope}.{name}
   * @property {*} value                    The setting value, which may be any type of data
   */
  export class SettingData extends DocumentData {
    static defineSchema(): {
      _id: any;
      key: {
        type: StringConstructor;
        required: boolean;
        validate: typeof _validateKeyFormat;
        validationError: string;
      };
      value: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a TableResult embedded document within a Roll Table.
   * @extends DocumentData
   * @memberof data
   * @see BaseTableResult
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseTableResult} [document]    The document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this TableResult embedded document
   * @property {string} [type=p]            A result sub-type from CONST.TABLE_RESULT_TYPES
   * @property {string} [text]              The text which describes the table result
   * @property {string} [img]               An image file url that represents the table result
   * @property {string} [collection]        A named collection from which this result is drawn
   * @property {string} [resultId]          The _id of a Document within the collection this result references
   * @property {number} [weight=1]          The probabilistic weight of this result relative to other results
   * @property {number[]} [range]           A length 2 array of ascending integers which defines the range of dice roll
   *                                        totals which produce this drawn result
   * @property {boolean} [drawn=false]      Has this result already been drawn (without replacement)
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class TableResultData extends DocumentData {
    static defineSchema(): {
      _id: any;
      type: {
        type: NumberConstructor;
        default: number;
        validate: (t: any) => boolean;
        validationError: string;
      };
      text: any;
      img: any;
      collection: any;
      resultId: any;
      weight: any;
      range: {
        type: NumberConstructor[];
        required: boolean;
        default: any[];
        validate: typeof _isValidResultRange;
        validationError: string;
      };
      drawn: any;
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Tile embedded document.
   * @extends DocumentData
   * @memberof data
   * @see BaseTile
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseTile} [document]           The embedded document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies this Tile embedded document
   * @property {string} img                 An image or video file path which this tile displays
   * @property {number} [width=100]         The pixel width of the tile
   * @property {number} [height=100]        The pixel height of the tile
   * @property {number} [scale=1]           The multiplicative scale factor for the tile
   * @property {number} [x=0]               The x-coordinate position of the top-left corner of the tile
   * @property {number} [y=0]               The y-coordinate position of the top-left corner of the tile
   * @property {number} [z=100]             The z-index ordering of this tile relative to its siblings
   * @property {number} [rotation=0]        The angle of rotation for the tile between 0 and 360
   * @property {boolean} [hidden=false]     Is the tile currently hidden?
   * @property {boolean} [locked=false]     Is the tile currently locked?
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class TileData extends DocumentData {
    static defineSchema(): {
      _id: any;
      img: any;
      width: any;
      height: any;
      x: any;
      y: any;
      z: any;
      rotation: any;
      alpha: any;
      tint: any;
      hidden: any;
      locked: any;
      overhead: any;
      occlusion: {
        type: typeof TileOcclusion;
        required: boolean;
        default: {};
      };
      video: {
        type: typeof VideoData;
        required: boolean;
        default: {};
      };
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Token document.
   * @extends DocumentData
   * @memberof data
   *
   * @param {object} data                 Initial data used to construct the data object
   * @param {BaseToken} [document]        The document to which this data object belongs
   *
   * @property {string} _id                 The Token _id which uniquely identifies it within its parent Scene
   * @property {string} name                The name used to describe the Token
   * @property {number} [displayName=0]     The display mode of the Token nameplate, from CONST.TOKEN_DISPLAY_MODES
   * @property {string|null} actorId        The _id of an Actor document which this Token represents
   * @property {boolean} [actorLink=false]  Does this Token uniquely represent a singular Actor, or is it one of many?
   * @property {object} [actorData]         Token-level data which overrides the base data of the associated Actor
   * @property {string} img                 A file path to an image or video file used to depict the Token
   * @property {string} [tint=null]         An optional color tint applied to the Token image
   * @property {number} [width=1]           The width of the Token in grid units
   * @property {number} [height=1]          The height of the Token in grid units
   * @property {number} [scale=1]           A scale factor applied to the Token image, between 0.25 and 3
   * @property {boolean} [mirrorX=false]    Flip the Token image horizontally?
   * @property {boolean} [mirrorY=false]    Flip the Token image vertically?
   * @property {number} [x=0]               The x-coordinate of the top-left corner of the Token
   * @property {number} [y=0]               The y-coordinate of the top-left corner of the Token
   * @property {number} [elevation=0]       The vertical elevation of the Token, in distance units
   * @property {boolean} [lockRotation=false]  Prevent the Token image from visually rotating?
   * @property {number} [rotation=0]        The rotation of the Token in degrees, from 0 to 360. A value of 0 represents a southward-facing Token.
   * @property {string[]} [effects]         An array of effect icon paths which are displayed on the Token
   * @property {string} [overlayEffect]     A single icon path which is displayed as an overlay on the Token
   * @property {boolean} [hidden=false]     Is the Token currently hidden from player view?
   * @property {boolean} [vision]           Is this Token a source of vision?
   * @property {number} [dimSight=0]        How far in distance units the Token can naturally see as if in dim light
   * @property {number} [brightSight=0]     How far in distance units the Token can naturally see as if in bright light
   * @property {number} [sightAngle=360]    The angle at which this Token is able to see, if it has vision
   * @property {number} [dimLight=0]        How far in distance units this Token emits dim light
   * @property {number} [brightLight=0]     How far in distance units this Token emits bright light
   * @property {number} [lightAngle=360]    The angle at which this Token is able to emit light
   * @property {AnimationData} [lightAnimation] A data object which configures token light animation settings
   * @property {number} [disposition=-1]    A displayed Token disposition from CONST.TOKEN_DISPOSITIONS
   * @property {number} [displayBars=0]     The display mode of Token resource bars, from CONST.TOKEN_DISPLAY_MODES
   * @property {data.TokenBarData} [bar1]        The configuration of the Token's primary resource bar
   * @property {data.TokenBarData} [bar2]        The configuration of the Token's secondary resource bar
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class TokenData extends DocumentData {
    static defineSchema(): {
      _id: any;
      name: any;
      displayName: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (m: any) => boolean;
        validationError: string;
      };
      actorId: any;
      actorLink: any;
      actorData: any;
      img: any;
      tint: any;
      width: any;
      height: any;
      scale: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (s: any) => any;
        validationError: string;
      };
      mirrorX: any;
      mirrorY: any;
      x: any;
      y: any;
      elevation: any;
      lockRotation: any;
      rotation: any;
      effects: {
        type: StringConstructor[];
        required: boolean;
        default: any[];
      };
      overlayEffect: any;
      alpha: any;
      hidden: any;
      vision: {
        type: BooleanConstructor;
        required: boolean;
        default: (data: any) => boolean;
      };
      dimSight: any;
      brightSight: any;
      dimLight: any;
      brightLight: any;
      sightAngle: any;
      lightAngle: any;
      lightColor: any;
      lightAlpha: any;
      lightAnimation: {
        type: typeof AnimationData;
        required: boolean;
        default: {};
      };
      disposition: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (n: any) => boolean;
        validationError: string;
      };
      displayBars: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (m: any) => boolean;
        validationError: string;
      };
      bar1: {
        type: typeof TokenBarData;
        required: boolean;
        default: () => {
          attribute: any;
        };
      };
      bar2: {
        type: typeof TokenBarData;
        required: boolean;
        default: () => {
          attribute: any;
        };
      };
      flags: any;
    };
    /**
     * The default icon used for newly created Item documents
     * @type {string}
     */
    static DEFAULT_ICON: string;
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a User document
   * @extends DocumentData
   * @memberof data
   * @see BaseUser
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseUser} [document]           The document to which this data object belongs
   */
  export class UserData extends DocumentData {
    static defineSchema(): {
      _id: any;
      avatar: any;
      character: any;
      color: any;
      hotbar: {
        type: ObjectConstructor;
        required: boolean;
        default: {};
        validate: typeof _validateHotbar;
        validationError: string;
      };
      name: any;
      password: any;
      permissions: any;
      role: {
        type: NumberConstructor;
        required: boolean;
        nullable: boolean;
        default: number;
      };
      flags: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema for a Wall document.
   * @extends DocumentData
   * @memberof data
   * @see BaseWall
   *
   * @param {object} data                   Initial data used to construct the data object
   * @param {BaseWall} [document]           The embedded document to which this data object belongs
   *
   * @property {string} _id                 The _id which uniquely identifies the embedded Wall document
   * @property {number[]} c                 The wall coordinates, a length-4 array of finite numbers [x0,y0,x1,y1]
   * @property {number} [move=0]            The movement restriction type of this wall
   * @property {number} [sense=0]           The sensory restriction type of this wall
   * @property {number} [dir=0]             The direction of effect imposed by this wall
   * @property {number} [door=0]            The type of door which this wall contains, if any
   * @property {number} [ds=0]              The state of the door this wall contains, if any
   * @property {object} [flags={}]          An object of optional key/value flags
   */
  export class WallData extends DocumentData {
    /**
     * The data schema for a WallData object
     * @returns {DocumentSchema}
     */
    static defineSchema(): any;
    constructor(data?: {}, document?: any);
  }
  import { DocumentData } from 'common/abstract/module';
  /**
   * An embedded data structure which defines the structure of a change applied by an ActiveEffect.
   * @extends DocumentData
   * @memberof data
   * @see ActiveEffectData
   *
   * @param {object} data                 Initial data used to construct the data object
   * @param {BaseActiveEffect} [document] The document to which this data object belongs
   *
   * @property {string} key         The attribute path in the Actor or Item data which the change modifies
   * @property {*) value            The value of the change effect
   * @property {number} mode        The modification mode with which the change is applied
   * @property {number} priority    The priority level with which this change is applied
   */
  class EffectChangeData extends DocumentData {
    static defineSchema(): {
      key: any;
      value: any;
      mode: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (m: any) => boolean;
        validationError: string;
      };
      priority: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * An embedded data structure which tracks the duration of an ActiveEffect.
   * @extends DocumentData
   * @memberof data
   * @see ActiveEffectData
   *
   * @param {object} data                 Initial data used to construct the data object
   * @param {BaseActiveEffect} [document] The document to which this data object belongs
   *
   * @property {number} startTime         The world time when the active effect first started
   * @property {number} [seconds]         The maximum duration of the effect, in seconds
   * @property {string} [combat]          The _id of the CombatEncounter in which the effect first started
   * @property {number} [rounds]          The maximum duration of the effect, in combat rounds
   * @property {number} [turns]           The maximum duration of the effect, in combat turns
   * @property {number} [startRound]      The round of the CombatEncounter in which the effect first started
   * @property {number} [startTurn]       The turn of the CombatEncounter in which the effect first started
   */
  class EffectDurationData extends DocumentData {
    static defineSchema(): {
      startTime: any;
      seconds: any;
      combat: any;
      rounds: any;
      turns: any;
      startRound: any;
      startTurn: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * An embedded data object which defines the properties of a light source animation
   * @extends {DocumentData}
   * @memberof data
   *
   * @param {object} data             Initial data used to construct the data object
   * @param {Document} [document]     The document to which this data object belongs
   *
   * @property {string} type          The animation type which is applied
   * @property {number} speed         The speed of the animation, a number between 1 and 10
   * @property {number} intensity     The intensity of the animation, a number between 1 and 10
   */
  class AnimationData extends DocumentData {
    static defineSchema(): {
      type: any;
      speed: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (a: any) => any;
        validationError: string;
      };
      intensity: {
        type: NumberConstructor;
        required: boolean;
        default: number;
        validate: (a: any) => any;
        validationError: string;
      };
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * An embedded data object which defines the darkness range during which some attribute is active
   * @extends {DocumentData}
   * @memberof data
   * @property {number} [min=0]       The minimum darkness level for which activation occurs
   * @property {number} [max=1]       The maximum darkness level for which activation occurs
   */
  class DarknessActivation extends DocumentData {
    static defineSchema(): {
      min: any;
      max: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * Validate that a ChatMessage has a valid type
   * @param {number} type     The assigned message type
   * @returns {boolean}       Is it valid?
   * @private
   */
  function _validateChatMessageType(type: number): boolean;
  /**
   * The data schema for an embedded Chat Speaker object.
   * @extends DocumentData
   * @memberof data
   * @see ChatMessageData
   *
   * @param {object} data                 Initial data used to construct the data object
   * @param {BaseChatMessage} [document]  The document to which this data object belongs
   *
   * @property {string} [scene]       The _id of the Scene where this message was created
   * @property {string} [actor]       The _id of the Actor who generated this message
   * @property {string} [token]       The _id of the Token who generated this message
   * @property {string} [alias]       An overridden alias name used instead of the Actor or Token name
   */
  class ChatSpeakerData extends DocumentData {
    static defineSchema(): {
      scene: any;
      actor: any;
      token: any;
      alias: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * Validate the array of points which comprises a polygon drawing
   * @param {Array<number[]>} points    The candidate points
   * @returns {boolean}                 Is the array valid?
   * @private
   */
  function _validateDrawingPoints(points: Array<number[]>): boolean;
  import { isBase64Image } from 'common/data/validators';
  /**
   * Verify that the initial view position for a Scene is valid
   * @param {object|null} pos       The scene position object, or null
   * @returns {boolean}             Is the position valid?
   * @private
   */
  function _validateInitialViewPosition(pos: object | null): boolean;
  /**
   * Validate that each setting key matches the expected format
   * @param {string} key      The key to test
   * @returns {boolean}       Is the key valid?
   * @private
   */
  function _validateKeyFormat(key: string): boolean;
  /**
   * Validate whether a table result has a valid result range.
   * @param {number[]} range    The proposed result range
   * @returns {boolean}         Is the range valid?
   * @private
   */
  function _isValidResultRange(range: number[]): boolean;
  /**
   * An inner-object which defines the schema for how Tile occlusion settings are defined
   * @extends DocumentData
   * @property {number} mode        The occlusion mode from CONST.TILE_OCCLUSION_MODES
   * @property {number} alpha       The occlusion alpha between 0 and 1
   * @property {number} [radius]    An optional radius of occlusion used for RADIAL mode
   */
  class TileOcclusion extends DocumentData {
    static defineSchema(): {
      mode: any;
      alpha: any;
      radius: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * An inner-object which defines the schema for how Tile video backgrounds are managed
   * @extends DocumentData
   * @property {boolean} loop       Automatically loop the video?
   * @property {boolean} autoplay   Should the video play automatically?
   * @property {number} volume      The volume level of any audio that the video file contains
   */
  class VideoData extends DocumentData {
    static defineSchema(): {
      loop: any;
      autoplay: any;
      volume: any;
    };
    constructor(data?: {}, document?: any);
    volume: any;
  }
  /**
   * An embedded data structure for the contents of a Token attribute bar.
   * @extends DocumentData
   * @see TokenData
   * @memberof data
   *
   * @param {object} data                 Initial data used to construct the data object
   * @param {BaseToken} [document]        The document to which this data object belongs
   *
   * @property {string} [attribute]       The attribute path within the Token's Actor data which should be displayed
   */
  class TokenBarData extends DocumentData {
    static defineSchema(): {
      attribute: {
        type: StringConstructor;
        default: any;
        nullable: boolean;
        required: boolean;
      };
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * Validate the structure of the User hotbar object
   * @param {object} bar      The attempted hotbar data
   * @return {boolean}
   * @private
   */
  function _validateHotbar(bar: object): boolean;
  export {};
}
declare module 'common/documents' {
  /**
   * The ActiveEffect document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                       Initial data from which to construct the document.
   * @property {data.ActiveEffectData} data     The constructed data object for the document.
   */
  export class BaseActiveEffect extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.ActiveEffectData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Actor document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data               Initial data from which to construct the document.
   * @property {data.ActorData} data    The constructed data object for the document.
   */
  export class BaseActor extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.ActorData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
    /**
     * A reference to the Collection of embedded ActiveEffect instances in the Actor document, indexed by _id.
     * @returns {Collection<BaseActiveEffect>}
     */
    get effects(): any;
    /**
     * A reference to the Collection of embedded Item instances in the Actor document, indexed by _id.
     * @returns {Collection<BaseItem>}
     */
    get items(): any;
    /**
     * Migrate the system data object to conform to data model defined by the current system version.
     * @see mergeObject
     * @param {object} options            Options which customize how the system data is migrated.
     * @param {boolean} options.insertKeys    Retain keys which exist in the current data, but not the model
     * @param {boolean} options.insertValues  Retain inner-object values which exist in the current data, but not the model
     * @param {boolean} options.enforceTypes  Require that data types match the model exactly to be retained
     * @return {object}                  The migrated system data object, not yet saved to the database
     */
    migrateSystemData({
      insertKeys,
      insertValues,
      enforceTypes,
    }?: {
      insertKeys: boolean;
      insertValues: boolean;
      enforceTypes: boolean;
    }): object;
  }
  /**
   * The AmbientLight embedded document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                     Initial data from which to construct the embedded document.
   * @property {data.AmbientLightData} data   The constructed data object for the embedded document.
   */
  export class BaseAmbientLight extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.AmbientLightData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The AmbientSound document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                     Initial data from which to construct the document.
   * @property {data.AmbientSoundData} data   The constructed data object for the document.
   */
  export class BaseAmbientSound extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.AmbientSoundData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Combat document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the document.
   * @property {data.CombatData} data     The constructed data object for the document.
   */
  export class BaseCombat extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.CombatData;
    /**
     * Is a user able to update an existing Combat?
     * @protected
     */
    protected static _canUpdate(user: any, doc: any, data: any): boolean;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
    /**
     * A reference to the Collection of Combatant instances in the Combat document, indexed by id.
     * @returns {Collection<BaseCombatant>}
     */
    get combatants(): any;
  }
  /**
   * The Combatant embedded document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                   Initial data from which to construct the document.
   * @property {data.CombatantData} data    The constructed data object for the document.
   */
  export class BaseCombatant extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.CombatantData;
    /**
     * Is a user able to update an existing Combatant?
     * @protected
     */
    protected static _canUpdate(user: any, doc: any, data: any): any;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The ChatMessage document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                     Initial data from which to construct the document.
   * @property {data.ChatMessageData} data    The constructed data object for the document.
   */
  export class BaseChatMessage extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.ChatMessageData;
    /**
     * Is a user able to create a new chat message?
     * @protected
     */
    protected static _canCreate(user: any, doc: any): any;
    /**
     * Is a user able to update an existing chat message?
     * @protected
     */
    protected static _canUpdate(user: any, doc: any, data: any): boolean;
    /**
     * Is a user able to delete an existing chat message?
     * @protected
     */
    protected static _canDelete(user: any, doc: any): boolean;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Drawing embedded document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the embedded document.
   * @property {data.DrawingData} data    The constructed data object for the embedded document.
   */
  export class BaseDrawing extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.DrawingData;
    /**
     * Is a user able to update or delete an existing Drawing document??
     * @protected
     */
    protected static _canModify(user: any, doc: any, data: any): boolean;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The FogExploration Document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                       Initial data from which to construct the document.
   * @property {data.FogExplorationData} data   The constructed data object for the document.
   */
  export class BaseFogExploration extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.FogExplorationData;
    /**
     * Test whether a User can modify a FogExploration document.
     * @protected
     */
    protected static _canUserModify(user: any, doc: any): any;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Folder Document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data               Initial data from which to construct the document.
   * @property {data.FolderData} data   The constructed data object for the document.
   */
  export class BaseFolder extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.FolderData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Item document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the document.
   * @property {data.ItemData} data       The constructed data object for the document.
   */
  export class BaseItem extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.ItemData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
    /**
     * A reference to the Collection of ActiveEffect instances in the Item document, indexed by _id.
     * @returns {Collection<BaseActiveEffect>}
     */
    get effects(): any;
    /**
     * Migrate the system data object to conform to data model defined by the current system version.
     * @see mergeObject
     * @param {object} options            Options which customize how the system data is migrated.
     * @param {boolean} options.insertKeys    Retain keys which exist in the current data, but not the model
     * @param {boolean} options.insertValues  Retain inner-object values which exist in the current data, but not the model
     * @param {boolean} options.enforceTypes  Require that data types match the model exactly to be retained
     * @return {object}                  The migrated system data object, not yet saved to the database
     */
    migrateSystemData({
      insertKeys,
      insertValues,
      enforceTypes,
    }?: {
      insertKeys: boolean;
      insertValues: boolean;
      enforceTypes: boolean;
    }): object;
  }
  /**
   * The JournalEntry document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                     Initial data from which to construct the document.
   * @property {data.JournalEntryData} data   The constructed data object for the document.
   */
  export class BaseJournalEntry extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.JournalEntryData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Macro document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data               Initial data from which to construct the document.
   * @property {data.MacroData} data    The constructed data object for the document.
   */
  export class BaseMacro extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.MacroData;
    /**
     * Is a user able to update an existing Macro document?
     * @protected
     */
    protected static _canUpdate(user: any, doc: any, data: any): boolean;
    /**
     * Is a user able to delete an existing Macro document?
     * @protected
     */
    protected static _canDelete(user: any, doc: any): boolean;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The MeasuredTemplate embedded document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                         Initial data from which to construct the embedded document.
   * @property {data.MeasuredTemplateData} data   The constructed data object for the embedded document.
   */
  export class BaseMeasuredTemplate extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.MeasuredTemplateData;
    /**
     * Is a user able to modify an existing MeasuredTemplate?
     * @protected
     */
    protected static _canModify(user: any, doc: any, data: any): boolean;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Note embedded document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the embedded document.
   * @property {data.NoteData} data       The constructed data object for the embedded document.
   * @property {BaseJournalEntry} entry   The associated JournalEntry which is referenced by this Note
   */
  export class BaseNote extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.NoteData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Playlist document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                   Initial data from which to construct the document.
   * @property {data.PlaylistData} data     The constructed data object for the document.
   */
  export class BasePlaylist extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.PlaylistData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
    /**
     * A reference to the Collection of ActiveEffect instances in the Actor document, indexed by _id.
     * @returns {Collection<BasePlaylistSound>}
     */
    get sounds(): any;
  }
  /**
   * The PlaylistSound document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                       Initial data from which to construct the document.
   * @property {data.PlaylistSoundData} data    The constructed data object for the document.
   */
  export class BasePlaylistSound extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.PlaylistSoundData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The RollTable document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                   Initial data from which to construct the document.
   * @property {data.RollTableData} data    The constructed data object for the document.
   */
  export class BaseRollTable extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.RollTableData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
    /**
     * A reference to the Collection of TableResult instances in this document, indexed by _id.
     * @returns {Collection<BaseTableResult>}
     */
    get results(): any;
  }
  /**
   * The Scene document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the document.
   * @property {data.SceneData} data      The constructed data object for the document.
   */
  export class BaseScene extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.SceneData;
    /**
     * Get the Canvas dimensions which would be used to display this Scene.
     * Apply padding to enlarge the playable space and round to the nearest 2x grid size to ensure symmetry.
     * @returns {object}    An object describing the configured dimensions
     */
    static getDimensions({
      width,
      height,
      size,
      gridDistance,
      padding,
      shiftX,
      shiftY,
    }?: {
      width: any;
      height: any;
      size: any;
      gridDistance: any;
      padding: any;
      shiftX: any;
      shiftY: any;
    }): object;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
    /**
     * A reference to the Collection of Drawing instances in the Scene document, indexed by _id.
     * @returns {Collection<BaseDrawing>}
     */
    get drawings(): any;
    /**
     * A reference to the Collection of AmbientLight instances in the Scene document, indexed by _id.
     * @returns {Collection<BaseAmbientLight>}
     */
    get lights(): any;
    /**
     * A reference to the Collection of Note instances in the Scene document, indexed by _id.
     * @returns {Collection<BaseNote>}
     */
    get notes(): any;
    /**
     * A reference to the Collection of AmbientSound instances in the Scene document, indexed by _id.
     * @returns {Collection<BaseAmbientSound>}
     */
    get sounds(): any;
    /**
     * A reference to the Collection of MeasuredTemplate instances in the Scene document, indexed by _id.
     * @returns {Collection<BaseMeasuredTemplate>}
     */
    get templates(): any;
    /**
     * A reference to the Collection of Token instances in the Scene document, indexed by _id.
     * @returns {Collection<BaseToken>}
     */
    get tokens(): any;
    /**
     * A reference to the Collection of Tile instances in the Scene document, indexed by _id.
     * @returns {Collection<BaseTile>}
     */
    get tiles(): any;
    /**
     * A reference to the Collection of Wall instances in the Scene document, indexed by _id.
     * @returns {Collection<BaseWall>}
     */
    get walls(): any;
  }
  /**
   * The Setting Document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data           Initial data from which to construct the document.
   * @property {data.SettingData} data   The constructed data object for the document.
   */
  export class BaseSetting extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.SettingData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
    /**
     * A convenience reference to the key which identifies this game setting.
     * @type {string}
     */
    get key(): string;
    /**
     * The parsed value of the saved setting
     * @type {any}
     */
    get value(): any;
  }
  /**
   * The TableResult document model.
   * @extends {Document}
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the document.
   * @property {data.TableResultData} data     The constructed data object for the document.
   */
  export class BaseTableResult extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.TableResultData;
    /**
     * Is a user able to update an existing TableResult?
     * @protected
     */
    protected static _canUpdate(user: any, doc: any, data: any): any;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Tile embedded document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the embedded document.
   * @property {data.TileData} data            The constructed data object for the embedded document.
   */
  export class BaseTile extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.TileData;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The Token document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the document.
   * @property {data.TokenData} data           The constructed data object for the document.
   */
  export class BaseToken extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.TokenData;
    /**
     * Is a user able to update an existing Token?
     * @protected
     */
    protected static _canUpdate(user: any, doc: any, data: any): any;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  /**
   * The base User Entity which is extended by both the server and client.
   * This base User provides shared functionality which is consistent for both sides of the application.
   * Each client who connects to a Foundry Virtual Tabletop session assumes the identity of one (and only one) User.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the document.
   * @property {data.UserData} data       The constructed data object for the document.
   */
  export class BaseUser extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.UserData;
    constructor(...args: any[]);
    /**
     * Test whether the User has a GAMEMASTER or ASSISTANT role in this World?
     * @type {boolean}
     */
    get isGM(): boolean;
    /**
     * Test whether the User is able to perform a certain permission action.
     * The provided permission string may pertain to an explicit permission setting or a named user role.
     * Alternatively, Gamemaster users are assumed to be allowed to take all actions.
     *
     * @param {string} action         The action to test
     * @return {boolean}              Does the user have the ability to perform this action?
     */
    can(action: string): boolean;
    /**
     * Test whether the User has at least a specific permission
     * @param {string} permission    The permission name from USER_PERMISSIONS to test
     * @return {boolean}             Does the user have at least this permission
     */
    hasPermission(permission: string): boolean;
    /**
     * Test whether the User has at least the permission level of a certain role
     * @param {string|number} role    The role name from USER_ROLES to test
     * @param {boolean} [exact]       Require the role match to be exact
     * @return {boolean}              Does the user have at this role level (or greater)?
     */
    hasRole(role: string | number, { exact }?: { exact: boolean }): boolean;
  }
  /**
   * The Wall embedded document model.
   * @extends Document
   * @memberof documents
   *
   * @param {object} data                 Initial data from which to construct the embedded document.
   * @property {data.WallData} data       The constructed data object for the embedded document.
   */
  export class BaseWall extends Document {
    /** @inheritdoc */
    static get schema(): typeof data.WallData;
    /**
     * Is a user able to update an existing Wall?
     * @protected
     */
    protected static _canUpdate(user: any, doc: any, data: any): any;
    constructor(
      data?: any,
      context?: {
        parent?: Document;
        pack?: string;
      },
    );
  }
  import { Document } from 'common/abstract/module';
  import * as data from 'common/data/data';
}
declare module 'common/data/module' {
  export * from 'common/data/data';
  export * as fields from 'common/data/fields';
  export * as validators from 'common/data/validators';
}
declare module 'common/packages' {
  /**
   * The data schema used to define World manifest files.
   * Extends the basic PackageData schema with some additional world-specific fields.
   * @extends {PackageData}
   * @property {string} system            The game system name which this world relies upon
   * @property {string} [background]      A web URL or local file path which provides a background banner image
   * @property {string} coreVersion       The version of the core software for which this world has been migrated
   * @property {string} systemVersion     The version of the game system for which this world has been migrated
   * @property {string} [nextSession]     An ISO datetime string when the next game session is scheduled to occur
   */
  export class WorldData extends PackageData {
    static defineSchema(): {
      name: any;
      title: any;
      description: any;
      author: any;
      authors: any;
      url: any;
      license: any;
      readme: any;
      bugs: any;
      changelog: any;
      flags: any;
      version: any;
      minimumCoreVersion: any;
      compatibleCoreVersion: any;
      scripts: any;
      esmodules: any;
      styles: any;
      languages: any;
      packs: any;
      system: any;
      dependencies: any;
      socket: any;
      manifest: any;
      download: any;
      protected: any;
    } & {
      system: any;
      background: any;
      coreVersion: any;
      nextSession: any;
      resetKeys: any;
      safeMode: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema used to define System manifest files.
   * Extends the basic PackageData schema with some additional system-specific fields.
   * @extends {PackageData}
   * @property {number} [gridDistance]      A default distance measurement to use for Scenes in this system
   * @property {string} [gridUnits]         A default unit of measure to use for distance measurement in this system
   * @property {string} [primaryTokenAttribute] An Actor data attribute path to use for Token primary resource bars
   * @property {string} [primaryTokenAttribute] An Actor data attribute path to use for Token secondary resource bars
   */
  export class SystemData extends PackageData {
    static defineSchema(): {
      name: any;
      title: any;
      description: any;
      author: any;
      authors: any;
      url: any;
      license: any;
      readme: any;
      bugs: any;
      changelog: any;
      flags: any;
      version: any;
      minimumCoreVersion: any;
      compatibleCoreVersion: any;
      scripts: any;
      esmodules: any;
      styles: any;
      languages: any;
      packs: any;
      system: any;
      dependencies: any;
      socket: any;
      manifest: any;
      download: any;
      protected: any;
    } & {
      initiative: any;
      gridDistance: any;
      gridUnits: any;
      primaryTokenAttribute: any;
      secondaryTokenAttribute: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema used to define Module manifest files.
   * Extends the basic PackageData schema with some additional module-specific fields.
   * @extends {PackageData}
   * @property {string} [minimumSystemVersion] A minimum version number of the game system that this module requires
   */
  export class ModuleData extends PackageData {
    static defineSchema(): {
      name: any;
      title: any;
      description: any;
      author: any;
      authors: any;
      url: any;
      license: any;
      readme: any;
      bugs: any;
      changelog: any;
      flags: any;
      version: any;
      minimumCoreVersion: any;
      compatibleCoreVersion: any;
      scripts: any;
      esmodules: any;
      styles: any;
      languages: any;
      packs: any;
      system: any;
      dependencies: any;
      socket: any;
      manifest: any;
      download: any;
      protected: any;
    } & {
      minimumSystemVersion: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * An inner data object which represents a single package author in the authors array.
   * @extends {DocumentData}
   * @property {string} name          The author name
   * @property {string} [email]       The author email address
   * @property {string} [url]         A website url for the author
   * @property {string} [discord]     A Discord username for the author
   */
  export class PackageAuthorData extends DocumentData {
    static defineSchema(): {
      name: any;
      email: any;
      url: any;
      discord: any;
    };
    constructor(data: any, context: any);
  }
  /**
   * An inner data object which represents a single compendium pack definition provided by a package in the packs array.
   * @extends {DocumentData}
   * @property {string} name        The canonical compendium name. This should contain no spaces or special characters.
   * @property {string} label       The human-readable compendium name.
   * @property {string} path        The local relative path to the compendium source .db file. The filename should match the name attribute.
   * @property {string} entity      The specific document type that is contained within this compendium pack
   * @property {string} [system]    Denote that this compendium pack requires a specific game system to function properly.
   */
  export class PackageCompendiumData extends DocumentData {
    static defineSchema(): {
      name: any;
      label: any;
      path: any;
      private: any;
      entity: any;
      system: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * An inner data object which represents a single package dependency in the dependencies array.
   * @extends {DocumentData}
   * @property {string} name          The dependency package name
   * @property {string} type          The dependency package type, from CONST.PACKAGE_TYPES
   * @property {string} [manifest]    An explicit manifest URL, otherwise learned from the Foundry web server
   */
  export class PackageDependencyData extends DocumentData {
    static defineSchema(): {
      name: any;
      type: any;
      manifest: any;
    };
    constructor(data?: {}, document?: any);
  }
  /**
   * An inner data object which represents a single language specification provided by a package in the languages array.
   * @extends {DocumentData}
   * @property {string} lang        A string language code which is validated by Intl.getCanonicalLocales
   * @property {string} name        The human-readable language name
   * @property {string} path        The relative path to included JSON translation strings
   * @property {string} [system]    Only apply this set of translations when a specific system is being used
   */
  export class PackageLanguageData extends DocumentData {
    static defineSchema(): {
      lang: any;
      name: any;
      path: any;
      system: any;
    };
    /**
     * Validate that a language code is supported as a canonical locale
     * @param {string} lang   The candidate language to validate
     * @returns {boolean}     Is it valid?
     */
    static validateLocale(lang: string): boolean;
    constructor(data?: {}, document?: any);
  }
  /**
   * The data schema used to define a Package manifest.
   * Specific types of packages extend this schema with additional fields.
   * @extends {DocumentData}
   * @property {string} name            The canonical package name, should be lower-case with no spaces or special characters
   * @property {string} title           The human-readable package title, containing spaces and special characters
   * @property {string} [description]   An optional package description, may contain HTML
   * @property {string} [author]        A singular package author; this is an old field staged for later deprecation, please use authors
   * @property {PackageAuthorData[]} [authors]  An array of author objects who are co-authors of this package. Preferred to the singular author field.
   * @property {string} [url]           A web url where more details about the package may be found
   * @property {string} [license]       A web url or relative file path where license details may be found
   * @property {string} [readme]        A web url or relative file path where readme instructions may be found
   * @property {string} [bugs]          A web url where bug reports may be submitted and tracked
   * @property {string} [changelog]     A web url where notes detailing package updates are available
   * @property {string} version         The current package version
   * @property {string} [minimumCoreVersion]  A minimum version of the core Foundry software which is required to use this package
   * @property {string} [compatibleCoreVersion] A maximum version of the core Foundry software beyond which compatibility is not guaranteed
   * @property {string[]} [scripts]       An array of urls or relative file paths for JavaScript files which should be included
   * @property {string[]} [esmodules]     An array of urls or relative file paths for ESModule files which should be included
   * @property {string[]} [styles]        An array of urls or relative file paths for CSS stylesheet files which should be included
   * @property {PackageLanguageData[]} [languages]  An array of language data objects which are included by this package
   * @property {PackageCompendiumData[]} [packs] An array of compendium packs which are included by this package
   * @property {string[]} [system]      An array of game system names which this module supports
   * @property {PackageDependencyData[]} [dependencies] An array of dependency objects which define required dependencies for using this package
   * @property {boolean} [socket]         Whether to require a package-specific socket namespace for this package
   * @property {string} [manifest]      A publicly accessible web URL which provides the latest available package manifest file. Required in order to support module updates.
   * @property {string} [download]      A publicly accessible web URL where the source files for this package may be downloaded. Required in order to support module installation.
   * @property {boolean} [protected=false] Whether this package uses the protected content access system.
   */
  class PackageData extends DocumentData {
    static defineSchema(): {
      name: any;
      title: any;
      description: any;
      author: any;
      authors: any;
      url: any;
      license: any;
      readme: any;
      bugs: any;
      changelog: any;
      flags: any;
      version: any;
      minimumCoreVersion: any;
      compatibleCoreVersion: any;
      scripts: any;
      esmodules: any;
      styles: any;
      languages: any;
      packs: any;
      system: any;
      dependencies: any;
      socket: any;
      manifest: any;
      download: any;
      protected: any;
    };
    constructor(data?: {}, document?: any);
  }
  import DocumentData from 'common/abstract/data';
  export {};
}
declare module 'common/utils/semaphore' {
  export default Semaphore;
  /**
   * A simple Semaphore implementation which provides a limited queue for ensuring proper concurrency.
   * @param {number} [max=1]    The maximum number of tasks which are allowed concurrently.
   *
   * @example
   * // Some async function that takes time to execute
   * function fn(x) {
   *   return new Promise(resolve => {
   *     setTimeout(() => {
   *       console.log(x);
   *       resolve(x);
   *     }, 1000));
   *   }
   * };
   *
   * // Create a Semaphore and add many concurrent tasks
   * const semaphore = new Semaphore(1);
   * for ( let i of Array.fromRange(100) ) {
   *   semaphore.add(fn, i);
   * }
   */
  class Semaphore {
    constructor(max?: number);
    /**
     * The maximum number of tasks which can be simultaneously attempted.
     * @type {number}
     */
    max: number;
    /**
     * A queue of pending function signatures
     * @type {Array<Array<Function|*>>}
     * @private
     */
    private _queue;
    /**
     * The number of tasks which are currently underway
     * @type {number}
     * @private
     */
    private _active;
    /**
     * The number of pending tasks remaining in the queue
     * @type {number}
     */
    get remaining(): number;
    /**
     * The number of actively executing tasks
     * @type {number}
     */
    get active(): number;
    /**
     * Add a new tasks to the managed queue
     * @param {Function} fn     A callable function
     * @param {...*} [args]     Function arguments
     */
    add(fn: Function, ...args: any[]): void;
    /**
     * Abandon any tasks which have not yet concluded
     */
    clear(): void;
    /**
     * Attempt to perform a task from the queue.
     * If all workers are busy, do nothing.
     * If successful, try again.
     * @return {boolean}        Was a function called?
     * @private
     */
    private _try;
  }
}
declare module 'common/utils/module' {
  export { default as Collection } from 'common/utils/collection';
  export * from 'common/utils/helpers';
  export { default as Semaphore } from 'common/utils/semaphore';
}
declare module 'common/module' {
  export * as abstract from 'common/abstract/module';
  export * as CONST from 'common/constants';
  export * as data from 'common/data/module';
  export * as documents from 'common/documents';
  export * as packages from 'common/packages';
  export * as utils from 'common/utils/module';
}
/**
 * A single point, expressed as an object {x, y}
 */
type Point = any;
/**
 * A single point, expressed as an array [x,y]
 */
type PointArray = number[];
/**
 * A Ray intersection point
 */
type RayIntersection = {
  x: number;
  y: number;
  t0: number;
  t1: number;
};
/**
 * A standard rectangle interface.
 */
type Rectangle = any;
type RequestData = any;
type SocketRequest = {
  /**
   * The server-side action being requested
   */
  action?: string;
  /**
   * The type of object being modified
   */
  type?: string;
  /**
   * Data applied to the operation
   */
  data?: RequestData;
  /**
   * A Compendium pack name
   */
  pack?: string;
  /**
   * The type of parent document
   */
  parentType?: string;
  /**
   * The ID of a parent document
   */
  parentId?: string;
  /**
   * Additional options applied to the request
   */
  options?: object;
};
type SocketResponse = {
  /**
   * The initial request
   */
  request: SocketRequest;
  /**
   * An error, if one occurred
   */
  error?: Error;
  /**
   * The status of the request
   */
  status?: string;
  /**
   * The ID of the requesting User
   */
  userId?: string;
  /**
   * Data returned as a result of the request
   */
  data?: RequestData;
};
