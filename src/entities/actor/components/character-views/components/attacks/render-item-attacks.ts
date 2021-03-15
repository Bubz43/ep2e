import { ItemType } from '@src/entities/entity-types';
import type { ItemProxy } from '@src/entities/item/item';
import { html } from 'lit-html';

export const renderItemAttacks = (weapon: ItemProxy) => {
  switch (weapon.type) {
    case ItemType.MeleeWeapon:
      return html`<character-view-melee-weapon-attacks
        .weapon=${weapon}
      ></character-view-melee-weapon-attacks>`;

    case ItemType.ThrownWeapon:
      return html`<character-view-thrown-weapon-attacks
        .weapon=${weapon}
      ></character-view-thrown-weapon-attacks>`;

    case ItemType.Explosive:
      return html` <character-view-explosive-attacks
        .explosive=${weapon}
      ></character-view-explosive-attacks>`;

    case ItemType.Software:
      return html`<character-view-software-attacks
        .software=${weapon}
      ></character-view-software-attacks>`;

    case ItemType.SeekerWeapon:
      return html`<character-view-seeker-attacks
        .weapon=${weapon}
      ></character-view-seeker-attacks>`;

    case ItemType.BeamWeapon:
      return html`<character-view-beam-attacks
        .weapon=${weapon}
      ></character-view-beam-attacks>`;

    case ItemType.Railgun:
      return html`<character-view-railgun-attacks
        .weapon=${weapon}
      ></character-view-railgun-attacks>`;

    case ItemType.Firearm:
      return html`<character-view-firearm-attacks
        .weapon=${weapon}
      ></character-view-firearm-attacks>`;

    case ItemType.SprayWeapon:
      return html`<character-view-spray-attacks
        .weapon=${weapon}
      ></character-view-spray-attacks>`;

    default:
      return undefined;
  }
};
