import type { MessageData } from '@src/chat/message-data';
import { setDragDrop, DropType } from '@src/foundry/drag-and-drop';
import { gmIsConnected } from '@src/foundry/misc-helpers';
import type { RollData } from '@src/foundry/rolls';
import { emitEPSocket } from '@src/foundry/socket';
import { EP } from '@src/foundry/system';
import { notEmpty } from '@src/utility/helpers';
import { last } from 'remeda';
import { findActor, findToken } from './find-entities';
import { UpdateStore } from './update-store';

export class ChatMessageEP extends ChatMessage {
  #updater?: UpdateStore<this['data']>;
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
    roll?: string | null; // RollData;
    user: string;
    type: number;
    timestamp: number;
    _id: string;
    sound: string | null;
  };
  get epFlags() {
    return this.data.flags[EP.Name];
  }

  get successTestResult() {
    return last(this.epFlags?.successTest?.states || [])?.result;
  }

  _onUpdate(...args: any[]) {
    //@ts-ignore
    super._onUpdate(...args);
    Object.values(this.apps).forEach((app) => app.render(true));
  }

  get updater() {
    if (!this.#updater) {
      this.#updater = new UpdateStore({
        getData: () => this.data,
        setData: (update) => {
          if (!this.editable)
            emitEPSocket({ messageData: { ...update, _id: this.data._id } });
          else this.update(update);
        },
        isEditable: gmIsConnected,
      });
    }
    return this.#updater;
  }

  get isWhisper() {
    return notEmpty(this.data.whisper);
  }

  get isBlind() {
    return this.data.blind;
  }

  get editable() {
    const { actor } = this;
    return game.user.isGM || (this.isAuthor && (!actor || actor.owner));
  }

  get actor() {
    const { actor, token, scene } = this.data.speaker;
    return actor
      ? findActor({
          actorId: actor,
          tokenId: token,
          sceneId: scene,
        })
      : null;
  }

  get token() {
    const { token, scene } = this.data.speaker;
    return findToken({ tokenId: token, sceneId: scene });
  }

  createSimilar(data: MessageData) {
    const { _id, user, timestamp, flags, ...common } = this.data;
    const { header } = this.epFlags ?? {};
    const chatMessageData: Partial<ChatMessageEP['data']> = {
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
    return ChatMessage.create(chatMessageData, {}) as Promise<
      ChatMessageEP['data']
    >;
  }

  get isLatest() {
    return last(game.messages._source)?._id === this.id;
  }

  setRollDrag(ev: DragEvent) {
    const { _roll } = this;
    const { flavor, _id } = this.data;
    setDragDrop(ev, {
      type: DropType.Roll,
      messageId: _id,
      roll: _roll?.total || 0,
      formula: _roll?.formula || '',
      flavor: flavor || '',
    });
  }
}
