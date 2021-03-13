import type { Character } from '@src/entities/actor/proxies/character';
import { ItemType } from '@src/entities/entity-types';
import type { Firearm } from '@src/entities/item/proxies/firearm';
import type { SeekerWeapon } from '@src/entities/item/proxies/seeker-weapon';
import { localize } from '@src/foundry/localization';
import { MWCMenuOption, openMenu } from '@src/open-menu';
import produce from 'immer';
import { html } from 'lit-html';
import { clamp, map, noop } from 'remeda';

export const openFirearmAmmoMenu = (
  ev: MouseEvent,
  character: Character,
  weapon: Firearm,
) => {
  const { ammo } = character.weapons;
  const matchingAmmo = ammo.flatMap((a) => {
    if (a.type === ItemType.FirearmAmmo && a.ammoClass === weapon.ammoClass)
      return a;
    return [];
  });

  const { specialAmmo } = weapon;

  const content: MWCMenuOption[] = [];
  if (specialAmmo) {
    const matching = matchingAmmo.filter((m) => m.isSameAs(specialAmmo));
  } else {
    if (content.length === 0) {
      content.push({
        label: `${localize('no')} ${localize('available')} ${localize(
          weapon.ammoClass,
        )} ${localize('ammo')}`,
        callback: noop,
        disabled: true,
      });
    }
  }

  openMenu({
    position: ev,
    header: { heading: `${weapon.name} ${localize('ammo')}` },
    content,
  });
};

export const openSeekerAmmoMenu = (
  ev: MouseEvent,
  character: Character,
  weapon: SeekerWeapon,
) => {
  const { ammo } = character.weapons;
  const {
    acceptableMissileSizes,
    missiles: currentMissiles,
    allowAlternativeAmmo,
    alternativeAmmo,
    primaryAmmo,
    currentCapacity,
  } = weapon;
  const missiles = ammo.flatMap((a) =>
    a.type !== ItemType.Explosive || !acceptableMissileSizes.includes(a.size)
      ? []
      : a,
  );

  const content: MWCMenuOption[] = [];
  if (currentMissiles) {
    const matching = missiles.filter((m) => m.isSameAs(currentMissiles));
    if (currentMissiles.quantity < currentCapacity) {
      for (const match of matching) {
        content.push({
          label: localize('reload'),
          sublabel: match.fullName,
          icon: html`<mwc-icon>refresh</mwc-icon>`,
          callback: async () => {
            if (match) {
              const change = clamp(currentCapacity - currentMissiles.quantity, {
                min: 0,
                max: match.quantity,
              });
              await match.setQuantity((current) => current - change);
              currentMissiles.setQuantity((current) => current + change);
            }
          },
          disabled: !match.quantity,
        });
      }
    }
    content.push({
      label: `${localize('unload')} ${currentMissiles.name}`,
      callback: async () => {
        const [same] = matching;
        if (same) {
          await same.setQuantity(
            (current) => current + currentMissiles.quantity,
          );
        } else {
          await character?.itemOperations.add(currentMissiles.getDataCopy());
        }
        await weapon.removeMissiles();
      },
    });
  } else {
    content.push(
      ...missiles.map((missile) => ({
        label: missile.fullName,
        sublabel: missile.fullType,
        disabled: !missile.quantity,
        callback: async () => {
          const max =
            allowAlternativeAmmo && alternativeAmmo.missileSize === missile.size
              ? alternativeAmmo.missileCapacity
              : primaryAmmo.missileCapacity;

          const change = clamp(missile.quantity, { max });
          const newAmmo = produce(missile.getDataCopy(), (draft) => {
            draft.data.quantity = change;
          });
          await missile.setQuantity((current) => current - change);
          weapon.setMissiles(newAmmo);
        },
      })),
    );
    if (content.length === 0) {
      content.push({
        label: `${localize('no')} ${localize('available')} ${map(
          acceptableMissileSizes,
          localize,
        ).join('/')} ${localize('missiles')}`,
        callback: noop,
        disabled: true,
      });
    }
  }

  openMenu({
    position: ev,
    header: { heading: `${weapon.name} ${localize('ammo')}` },
    content,
  });
};
