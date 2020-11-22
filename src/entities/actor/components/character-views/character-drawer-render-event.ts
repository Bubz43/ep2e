import type { TemplateResult } from 'lit-html';

export enum CharacterDrawerRenderer {
  Resleeve = 'Resleeve',
  Effects = 'Effects',
}

export class CharacterDrawerRenderEvent extends Event {
  static get is() {
    return 'character-drawer-render' as const;
  }

  constructor(public readonly renderer: CharacterDrawerRenderer) {
    super(CharacterDrawerRenderEvent.is, { bubbles: true, composed: true });
  }
}

declare global {
  interface HTMLElementEventMap {
    'character-drawer-render': CharacterDrawerRenderEvent;
  }
}
