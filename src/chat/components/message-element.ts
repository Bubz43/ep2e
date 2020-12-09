import { LitElement } from "lit-element";
import { ChatMessageRequestEvent } from "../chat-message-request-event";

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
}