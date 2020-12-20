import type { UpdateActions } from '@src/entities/update-store';
import { EP } from '@src/foundry/system';
import { LitElement } from 'lit-element';
import { ChatMessageRequestEvent } from '../chat-message-request-event';
import type { MessageData } from '../message-data';

export class MessageElement extends LitElement {
  get message() {
    const event = new ChatMessageRequestEvent();
    this.dispatchEvent(event);
    return event.chatMessage!;
  }

  get nonInteractive() {
    const event = new ChatMessageRequestEvent();
    this.dispatchEvent(event);
    return !!event.nonInteractive;
  }

  get disabled() {
    return this.nonInteractive || !this.message.editable;
  }

  getUpdater<T extends keyof MessageData>(
    key: T,
  ): UpdateActions<MessageData[T]> {
    return this.message.updater.prop('flags', EP.Name, key);
  }
}
