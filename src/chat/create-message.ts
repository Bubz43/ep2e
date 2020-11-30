import { ActorEP, ActorProxy } from '@src/entities/actor/actor';
import type { ChatMessageEP } from '@src/entities/chat-message';
import { EP } from '@src/foundry/system';
import type { RequireAtLeastOne } from 'type-fest';
import type { MessageData } from './message-data';

export enum MessageVisibility {
  Public = 'public',
  WhisperGM = 'whisperGM',
  Blind = 'blind',
}


export type MessageInit = {
  data: MessageData;
  content: string;
  visibility: MessageVisibility;
  roll: Roll;
  flavor: string;
  alias: string;
  entity: Token | ActorEP | ActorProxy | null;
}

export const messageContentPlaceholder = '_';

const splitEntity = (entity: MessageInit['entity']) => {
  return {
    actor: entity instanceof ActorEP ? entity : entity?.actor,
    token: entity instanceof Token ? entity : null,
  };
};

export const createMessage = async (
  {
    content = messageContentPlaceholder,
    visibility = MessageVisibility.Public,
    data,
    roll,
    flavor,
    alias,
    entity,
  }: RequireAtLeastOne<MessageInit, "content" | "data" | "roll">,
): Promise<ChatMessageEP> => {
  const { actor, token } = splitEntity(entity);
  const chatMessageData: Partial<ChatMessageEP['data']> = {
    content,
    flavor,
    roll,
    flags: { [EP.Name]: data, core: { canPopout: true } },
    speaker: ChatMessage.getSpeaker({
      alias: alias || entity?.name,
      scene: token?.scene,
      actor,
      token,
    }),
    type: roll ? CONST.CHAT_MESSAGE_TYPES.ROLL : undefined,
    blind: visibility === MessageVisibility.Blind,
    whisper:
      visibility !== MessageVisibility.Public &&
      ChatMessage.getWhisperRecipients('GM'),
  };
  return ChatMessage.create(chatMessageData, {});
};
