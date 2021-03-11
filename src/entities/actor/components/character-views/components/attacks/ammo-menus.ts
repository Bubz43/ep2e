import type { Character } from '@src/entities/actor/proxies/character';
import { ItemType } from '@src/entities/entity-types';
import type { SeekerWeapon } from '@src/entities/item/proxies/seeker-weapon';
import { localize } from '@src/foundry/localization';
import { MWCMenuOption, openMenu } from '@src/open-menu';
import produce from 'immer';
import { clamp, map, noop } from 'remeda';

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
    const same = missiles.find((m) => m.isSameAs(currentMissiles));
    if (currentMissiles.quantity < currentCapacity) {
      content.push({
        label: localize('reload'),
        callback: async () => {
          // TODO handle multiple same missiles with different quantities
          if (same) {
            const change = clamp(
              same.quantity - (currentMissiles.quantity || 0),
              { min: 0, max: currentCapacity },
            );
            await same.setQuantity((current) => current - change);
            currentMissiles.setQuantity((current) => current + change);
          }
        },
        disabled: !same?.quantity,
      });
    }
    content.push({
      label: `${localize('unload')} ${currentMissiles.name}`,
      callback: async () => {
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
