import type { EntityType } from './foundry-cont';
import type { Class } from 'type-fest';

type HookType = keyof Pick<
  typeof Hooks,
  'on' | 'off' | 'once' | 'call' | 'callAll'
>;

export enum MutateEvent {
  PreCreate = 'preCreate',
  Create = 'create',
  PreUpdate = 'preUpdate',
  Update = 'update',
  PreDelete = 'preDelete',
  Delete = 'delete',
}

export const applicationHook = <
  T extends Class<Omit<Application, 'render' | 'close' | 'setPosition'>>
>({
  app,
  hook,
  event,
  callback,
}: {
  app: T;
  hook: HookType;
  event: 'render' | 'close';
  callback: (app: InstanceType<T>, wrappedHTML: JQuery, data: unknown) => void;
}) => Hooks[hook](event + app.prototype.constructor.name, callback);

export const mutateEntityHook = <T extends EntityType, E = InstanceType<T>>({
  entity,
  hook,
  event,
  callback: cb,
}: {
  entity: T;
  hook: HookType;
  event: MutateEvent | 'hover';
  callback: (ent: E, more: unknown) => void;
}) => Hooks[hook](event + entity.entity, cb);

export const mutatePlaceableHook = <
  T extends Pick<PlaceableObject, 'uuid' | 'clone' | 'refresh' | '_canHUD'>
>({
  entity,
  hook,
  event,
  callback: cb,
}: {
  entity: Class<T>;
  hook: HookType;
  event: MutateEvent;
  callback: (
    scene: Scene,
    entData: T extends { data: unknown } ? T['data'] : unknown,
    change: unknown,
  ) => void;
}) => Hooks[hook](event + entity.name, cb);
