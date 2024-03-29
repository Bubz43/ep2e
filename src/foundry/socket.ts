import type { CombatUpdateAction } from '@src/combat/combat-tracker';
import type { ItemOperations } from '@src/entities/actor/actor';
import type { ChatMessageEP } from '@src/entities/chat-message';
import type { ActorIdentifiers } from '@src/entities/find-entities';
import { once } from 'remeda';
import type { DeepPartial } from 'utility-types';
import { EP } from './system';

type ItemChange = {
  itemIds: string[];
  type: keyof ItemOperations;
};

export type SystemSocketData = {
  itemChange:
    | ({ actorId: string } & ItemChange)
    | ({ tokenId: string; sceneId: string } & ItemChange);
  actorChanged: ActorIdentifiers;
  messageData: DeepPartial<ChatMessageData> & { _id: string };
  worldTimeChange: [date: number, change: string];
  mutateCombat: { action: CombatUpdateAction };
};

type SystemSocketEvent = keyof SystemSocketData;

type SocketHandler<T extends SystemSocketEvent> = ((
  data: SystemSocketData[T],
  id: string,
  local: boolean,
) => unknown | Promise<unknown>) & { once?: boolean };

const socketListeners = new Map<
  string,
  Set<SocketHandler<SystemSocketEvent>>
>();

const isSystemSocketEvent = (event: string): event is SystemSocketEvent =>
  socketListeners.has(event);

const systemSocketHandler = (
  socketData: Partial<SystemSocketData>,
  id: string,
  local: boolean,
) => {
  for (const [event, data] of Object.entries(socketData)) {
    if (isSystemSocketEvent(event) && data) {
      socketListeners.get(event)?.forEach(async (_, handler, handlers) => {
        await handler(data, id, local);
        if (handler.once) handlers.delete(handler);
      });
    }
  }
};

export const addEPSocketHandler = <T extends SystemSocketEvent>(
  key: T,
  handler: SocketHandler<T>,
  { once = false } = {},
) => {
  handler.once = handler.once ?? once;
  const current = (socketListeners.get(key) || new Set()) as Set<
    typeof handler
  >;
  current.add(handler);
  socketListeners.set(key, current as Set<SocketHandler<SystemSocketEvent>>);
  return () => current.delete(handler);
};

export const emitEPSocket = (
  data: Partial<SystemSocketData>,
  transmitLocally = false,
) => {
  if (transmitLocally)
    systemSocketHandler(data, game.socket.id, transmitLocally);
  return game.socket.emit(EP.Socket, data);
};

export const setupSystemSocket = once(() =>
  game.socket.on(EP.Socket, systemSocketHandler),
);
