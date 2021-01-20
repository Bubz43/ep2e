import { html } from 'lit-html';
import { pipe, filter, sortBy, first, map, prop, purry } from 'remeda';
import type { Class, SetRequired } from 'type-fest';
import { unsafeHTML } from 'lit-html/directives/unsafe-html';
import { ActorEP } from '../entities/actor/actor';
import { UpdateStore } from '@src/entities/update-store';
import type { DeepPartial } from 'utility-types';

export const isGamemaster = () => {
  return (
    isPrimaryGM() ||
    (game.user.isGM &&
      !primaryGmIsConnected() &&
      pipe(
        [...game.users.values()],
        filter((user) => user.active && user.isGM),
        sortBy((user) => user.data._id),
        (gms) => first(gms) === game.user,
      ))
  );
};

const isPrimaryGM = (user = game.user) => {
  return user.data.role === CONST.USER_ROLES.GAMEMASTER;
};

export const gmIsConnected = () => {
  return [...game.users.values()].some((user) => user.active && user.isGM);
};

const primaryGmIsConnected = () => {
  return [...game.users.values()].some((user) => user.active && isPrimaryGM(user));
};

export const canViewActor = (actor: ActorEP) => {
  return actor.hasPerm(game.user, CONST.ENTITY_PERMISSIONS.OBSERVER);
};

export const userCan = (permission: keyof typeof USER_PERMISSIONS) => {
  return game.user.can(permission);
};

export const packEntityIs = <T extends Class<Entity>, E = InstanceType<T>>(
  pack: Compendium,
  cls: T,
): pack is Omit<Compendium, 'getContent' | 'cls'> & {
  getContent(): Promise<E[]>;
  cls: T;
} => pack.cls === cls;

export const packIsVisible = (pack: Compendium) =>
  game.user.isGM || !pack.private;

export const importFromCompendium = (
  compendium: Compendium,
  entryId: string,
) => {
  compendium.cls.collection.importFromCollection(
    compendium.collection,
    entryId,
    {},
    { renderSheet: true },
  );
};

export const performIntegerSort = <T extends { id: string }>({
  src,
  target,
  siblings,
  sortBefore,
}: {
  src: T;
  target: T;
  siblings: T[];
  sortBefore: boolean;
}) => {
  const sorted = SortingHelpers.performIntegerSort(src, {
    target: (target as unknown) as null,
    siblings: siblings as never[],
    sortBefore,
    sortKey: 'sort',
  }) as { target: T; update: { sort: number } }[];
  return sorted.map(({ target, update }) => [target, update.sort] as const);
};

type FoundryOption = {
  name: string;
  icon: string; // use unsafeHTML,
  condition?: ((target: JQuery) => boolean | number) | boolean;
  callback: (target: JQuery) => void;
};

export const convertMenuOptions = (
  options: FoundryOption[],
  targetLi: JQuery<HTMLElement>,
) => {
  return (options || []).flatMap(({ name, icon, condition, callback }) =>
    (
      typeof condition === 'function'
        ? condition(targetLi)
        : condition !== false
    )
      ? {
          label: game.i18n.localize(name),
          icon: html`${unsafeHTML(icon)}`,
          callback: () => callback(targetLi),
        }
      : [],
  );
};

type TokenActor = SetRequired<ActorEP, 'token'>;

export const updateManyActors = async (actors: ActorEP[]): Promise<unknown> => {
  const tokens = new Map<Scene, TokenActor[]>();
  const gameActors: typeof actors = [];
  for (const actor of actors) {
    if (actor.updater.isEmpty) continue;
    if (actor.isToken) {
      const tokenActor = actor as TokenActor;
      const { scene } = tokenActor.token;
      scene && tokens.set(scene, (tokens.get(scene) || []).concat(tokenActor));
    } else gameActors.push(actor);
  }

  return Promise.all(
    map([...tokens], ([scene, tokenActors]) =>
      scene.updateEmbeddedEntity(
        'Token',
        pipe(
          tokenActors,
          filter((tokenActor) => tokenActor.token.scene === scene),
          map(
            (tokenActor) =>
              new UpdateStore({
                getData: () => tokenActor.token.data,
                isEditable: () => true,
                setData: (update) => tokenActor.update(update),
              })
                .path('actorData')
                .append(tokenActor.updater as any), // Deep partial on actorData messes this up
          ),
          UpdateStore.prepUpdateMany,
        ),
      ),
    ).concat(
      pipe(
        gameActors,
        map(prop('updater')),
        UpdateStore.prepUpdateMany,
        (updates) => ActorEP.update(updates),
      ),
    ),
  );
};
function _deepMerge<T>(original: T, changes: Partial<DeepPartial<T>>): T {
  return mergeObject(original, changes, { inplace: false });
}
export function deepMerge<T>(
  original: T,
): (changes: Partial<DeepPartial<T>>) => T;
export function deepMerge<T>(original: T, changes: Partial<DeepPartial<T>>): T;
export function deepMerge() {
  return arguments.length === 1
    ? (changes: any) => _deepMerge(arguments[0], changes)
    : _deepMerge(arguments[0], arguments[1]);
}

export const toTuple = <T>(value: T): [T] => [value];

export const capitalize = <T extends string>([c = '', ...characters]: T) =>
  (c.toLocaleUpperCase() + characters.join('')) as Capitalize<T>;
