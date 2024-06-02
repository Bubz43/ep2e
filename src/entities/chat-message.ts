import type { MessageData } from '@src/chat/message-data';
import { DropType, setDragDrop } from '@src/foundry/drag-and-drop';
import { gmIsConnected } from '@src/foundry/misc-helpers';
import { emitEPSocket } from '@src/foundry/socket';
import { EP } from '@src/foundry/system';
import { notEmpty } from '@src/utility/helpers';
import { findActor, findToken } from './find-entities';
import { UpdateStore } from './update-store';

export class ChatMessageEP extends ChatMessage {
  #updater?: UpdateStore<ChatMessageData>;
  declare data: {
    flags: {
      [EP.Name]?: MessageData;
      core?: { canPopout?: boolean };
    };
    flavor?: string | null;
    blind: boolean;
    whisper: string[];
    speaker: Partial<{
      actor: string | null;
      alias: string | null;
      scene: string | null;
      token: string | null;
    }>;
    content: string;
    rolls: string[]; // RollData;
    // roll?: string | null; // RollData;
    user: string;
    type: number;
    timestamp: number;
    _id: string;
    sound: string | null;
  };
  get epFlags() {
    return this.flags[EP.Name];
  }

  // toJSON() {
  //   return super.toJSON() as {
  //     flags: {
  //       [EP.Name]?: MessageData;
  //       core?: { canPopout?: boolean };
  //     };
  //     flavor?: string | null;
  //     blind: boolean;
  //     whisper: string[];
  //     speaker: Partial<{
  //       actor: string | null;
  //       alias: string | null;
  //       scene: string | null;
  //       token: string | null;
  //     }>;
  //     content: string;
  //     roll?: string | null; // RollData;
  //     user: string;
  //     type: number;
  //     timestamp: number;
  //     _id: string;
  //     sound: string | null;
  //   };
  // }

  _onUpdate(...args: any[]) {
    //@ts-ignore
    super._onUpdate(...args);
    Object.values(this.apps).forEach((app) => app.render(true));
  }

  get updater() {
    if (!this.#updater) {
      this.#updater = new UpdateStore({
        getData: () => this.toJSON(),
        setData: (update) => {
          if (!this.editable)
            emitEPSocket({ messageData: { ...update, _id: this.id } });
          else this.update(update);
        },
        isEditable: () => this.editable,
      });
    }
    return this.#updater;
  }

  get isContentVisible() {
    if (this.epFlags?.successTest) {
      const whisper = this.whisper || [];
      const isBlind = whisper.length && this.blind;
      if (whisper.length)
        return whisper.includes(game.user.id) || (this.isAuthor && !isBlind);
    }
    return super.isContentVisible;
  }

  get isWhisper() {
    return notEmpty(this.whisper);
  }

  get isBlind() {
    return this.blind;
  }

  get isAuthor() {
    return !!this.author?.isSelf
  }

  get editable() {
    const { actor } = this;
    return game.user.isGM || (this.isAuthor && (!actor || actor.isOwner));
  }

  get actor() {
    const { actor, token, scene } = this.speaker;
    return actor
      ? findActor({
          actorId: actor,
          tokenId: token,
          sceneId: scene,
        })
      : null;
  }

  get token() {
    const { token, scene } = this.speaker;
    return findToken({ tokenId: token, sceneId: scene });
  }

  createSimilar(data: MessageData) {
    const { id, author: user, timestamp, flags, ...common } = this;
    const { header } = this.epFlags ?? {};
    const chatMessageData: Partial<ChatMessageData> = {
      ...common,
      flags: {
        [EP.Name]: {
          ...data,
          header: data.header ?? header,
          fromMessageId: data.fromMessageId ?? this.id,
        },
        core: { canPopout: true },
      },
    };
    return ChatMessage.create(chatMessageData, {}) as Promise<ChatMessageEP>;
  }

  setRollDrag(ev: DragEvent) {
    const { _roll } = this;
    const { flavor, id } = this;
    setDragDrop(ev, {
      type: DropType.Roll,
      messageId: id,
      roll: _roll?.total || 0,
      formula: _roll?.formula || '',
      flavor: flavor || '',
    });
  }
}
