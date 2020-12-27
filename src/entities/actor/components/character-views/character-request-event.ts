import type { MaybeToken } from '../../actor';
import type { Character } from '../../proxies/character';

export class CharacterRequestEvent extends Event {
  static get is() {
    return 'character-request' as const;
  }

  character: Character | null = null;
  token: MaybeToken = null;

  constructor() {
    super(CharacterRequestEvent.is, { bubbles: true, composed: true });
  }
}

export const requestCharacter = (el: EventTarget) => {
  const event = new CharacterRequestEvent();
  el.dispatchEvent(event);
  return event;
};

declare global {
  interface HTMLElementEventMap {
    'character-request': CharacterRequestEvent;
  }
}
