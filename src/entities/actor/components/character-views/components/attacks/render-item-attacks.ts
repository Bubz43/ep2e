import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { html } from 'lit-html';

export const renderItemAttacks = (weapon: ItemProxy) => {
  switch (weapon.type) {
    case ItemType.MeleeWeapon:
      return html`<character-view-melee-weapon-attacks
        .weapon=${weapon}
      ></character-view-melee-weapon-attacks>`;

    case ItemType.Explosive:
      return html` <character-view-explosive-attacks
        .explosive=${weapon}
      ></character-view-explosive-attacks>`;

    case ItemType.Software:
      return html`<character-view-software-attacks
        .software=${weapon}
      ></character-view-software-attacks>`;

    default:
      return undefined;
  }
};
