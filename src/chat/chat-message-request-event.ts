import type { ChatMessageEP } from '@src/entities/chat-message';

export class ChatMessageRequestEvent extends Event {
  static get is() {
    return 'chat-message-request' as const;
  }

  chatMessage?: ChatMessageEP;
  nonInteractive?: boolean;
  constructor() {
    super(ChatMessageRequestEvent.is, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    'chat-message-request': ChatMessageRequestEvent;
  }
}
