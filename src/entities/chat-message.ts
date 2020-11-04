import type { MessageData } from '@src/chat/create-message';
import { setDragDrop, DropType } from '@src/foundry/drag-and-drop';
import { EP } from '@src/foundry/system';
import { notEmpty } from '@src/utility/helpers';
import { findActor, findToken } from './find-entities';
import { UpdateStore } from './update-store';

export class ChatMessageEP extends ChatMessage {
  #updater?: UpdateStore<this['data']>;

  get epFlags() {
    return this.data.flags[EP.Name];
  }

  _onUpdate(...args: any[]) {
    //@ts-ignore
    super._onUpdate(...args);
    // Object.values(this.apps).forEach((app) => app.render(true));
  }

  get updater() {
    if (!this.#updater) {
      this.#updater = new UpdateStore({
        getData: () => this.data,
        setData: this.update.bind(this),
        isEditable: () => this.editable,
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
    const chatMessageData: Partial<ChatMessageEP['data']> = {
      ...common,
      flags: { [EP.Name]: data, core: { canPopout: true } },
    };
    return ChatMessage.create(chatMessageData, {});
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
