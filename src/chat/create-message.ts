import { ActorEP, ActorProxy } from '@src/entities/actor/actor';
import type { ChatMessageEP } from '@src/entities/chat-message';
import { EP } from '@src/foundry/system';
import type { RequireAtLeastOne } from 'type-fest';
import type { MessageData } from './message-data';

export enum MessageVisibility {
  Public = 'public',
  WhisperGM = 'whisperGM',
  Self = 'self',
  Blind = 'blind',
}

export const rollModeToVisibility = (rollMode: string) => {
  switch (rollMode) {
    case CONST.DICE_ROLL_MODES.BLIND:
      return MessageVisibility.Blind;

    case CONST.DICE_ROLL_MODES.PRIVATE:
      return MessageVisibility.WhisperGM;

    case CONST.DICE_ROLL_MODES.SELF:
      return MessageVisibility.Self;

    default:
      return MessageVisibility.Public;
  }
};

export type MessageInit = Partial<{
  data: MessageData;
  content: string;
  visibility: MessageVisibility;
  roll: Roll;
  flavor: string;
  alias: string;
  entity: Token | ActorEP | ActorProxy | null | TokenDocument;
  whisper: string[];
}>;

export const messageContentPlaceholder = '_';

const splitEntity = (entity: MessageInit['entity']) => {
  return {
    actor: entity instanceof ActorEP ? entity : entity?.actor,
    token:
      entity instanceof Token
        ? entity.document
        : entity instanceof TokenDocument
        ? entity
        : null,
  };
};

export const createMessage = async ({
  content = messageContentPlaceholder,
  visibility = MessageVisibility.Public,
  data,
  roll,
  flavor,
  alias,
  entity,
  whisper,
}: RequireAtLeastOne<
  MessageInit,
  'content' | 'data' | 'roll'
>): Promise<ChatMessageEP> => {
  const { actor, token } = splitEntity(entity);
  const chatMessageData: Partial<ChatMessageData> = {
    content: roll?.total ?? content,
    flavor,
    rolls: roll ? [JSON.stringify(roll)] : [],
    flags: { [EP.Name]: data, core: { canPopout: true } },
    speaker:
      entity === null
        ? { alias }
        : ChatMessage.getSpeaker({
            alias: alias || entity?.name,
            scene: token?.parent,
            actor,
            token,
          }),
    type: roll ? CONST.CHAT_MESSAGE_TYPES.ROLL : undefined,
    blind: visibility === MessageVisibility.Blind,
    whisper:
      whisper ||
      (visibility === MessageVisibility.Self
        ? [game.user.id]
        : visibility !== MessageVisibility.Public
        ? ChatMessage.getWhisperRecipients('GM').map((i: User) => i.id)
        : undefined),
  };
  if ('dice3d' in game) {
    const successTestRoll =
      chatMessageData.flags?.ep2e?.successTest?.states[0]?.roll;
    if (successTestRoll != null) {
      const [tens, ones] =
        successTestRoll < 10
          ? `${0}${successTestRoll}`
          : String(successTestRoll);
      // @ts-ignore
      await game.dice3d.show({
        throws: [
          {
            dice: [
              {
                resultLabel: Number(`${tens}0`),
                d100Result: successTestRoll,
                result: Number(tens),
                type: 'd100',
                vectors: [],
                options: {},
              },
              {
                resultLabel: Number(ones),
                d100Result: successTestRoll,
                result: Number(ones),
                type: 'd10',
                vectors: [],
                options: {},
              },
            ],
          },
        ],
      });
    }
  }

  return ChatMessage.create(chatMessageData, {}) as Promise<ChatMessageEP>;
};
