export enum CharacterDrawerRenderer {
  Resleeve = 'Resleeve',
  Effects = 'Effects',
  Search = 'Search',
  Recharge = 'Recharge',
  Time = 'Time',
  NetworkSettings = 'NetworkSettings',
  Armor = 'Armor',
  MentalHealth = 'MentalHealth',
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
