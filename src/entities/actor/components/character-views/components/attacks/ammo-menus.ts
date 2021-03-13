import type { Character } from '@src/entities/actor/proxies/character';
import { ItemType } from '@src/entities/entity-types';
import type { Firearm } from '@src/entities/item/proxies/firearm';
import { FirearmAmmo } from '@src/entities/item/proxies/firearm-ammo';
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

  const { specialAmmo, ammoCapacity, ammoData } = weapon;
  const { value: ammoCount } = ammoData;
  const content: MWCMenuOption[] = [];
  if (specialAmmo) {
    const matching = matchingAmmo.filter((m) => m.isSameAs(specialAmmo));
    if (ammoCount < ammoCapacity) {
      for (const match of matching) {
        content.push({
          label: localize('reload'),
          sublabel: match.fullName,
          icon: html`<mwc-icon>refresh</mwc-icon>`,
          callback: async () => {
            if (match) {
              const change = clamp(
                (ammoCount ? ammoCapacity : ammoCapacity - 1) - ammoCount,
                {
                  min: 0,
                  max: match.quantity,
                },
              );
              await match.setQuantity((current) => current - change);
              weapon.updateAmmoCount(ammoCount + change);
            }
          },
          disabled: !match.quantity,
        });
      }
    }
    content.push({
      label: `${localize('unload')} ${specialAmmo.name}`,
      callback: async () => {
        const [same] = matching;
        if (same) {
          await same.setQuantity((current) => current + ammoCount);
        } else {
          await character?.itemOperations.add(
            produce(specialAmmo.getDataCopy(), (draft) => {
              draft.data.quantity = ammoCount;
            }),
          );
        }
        weapon.updater.batchCommits(() => {
          weapon.updateAmmoCount(0);
          weapon.removeSpecialAmmo();
        });
      },
    });
  } else {
    content.push(
      {
        label: `${localize('reload')} (${localize('standard')})`,
        callback: () => weapon.reloadStandardAmmo(),
        disabled: ammoCount === ammoCapacity,
        icon: html`<mwc-icon>refresh</mwc-icon>`,
      },
      ...matchingAmmo.map((ammo) => ({
        label: ammo.fullName,
        disabled: !ammo.quantity,
        callback: async () => {
          const max = ammoCapacity - 1;
          const change = clamp(ammo.quantity, { max });
          const newAmmo = produce(ammo.getDataCopy(), (draft) => {
            draft.data.quantity = change;
          });
          await ammo.setQuantity((current) => current - change);
          weapon.setSpecialAmmo(
            new FirearmAmmo({
              data: newAmmo,
              embedded: null,
              loaded: false,
            }),
          );
        },
      })),
    );

    // if (content.length === 0) {
    //   content.push({
    //     label: `${localize('no')} ${localize('available')} ${localize(
    //       weapon.ammoClass,
    //     )} ${localize('ammo')}`,
    //     callback: noop,
    //     disabled: true,
    //   });
    // }
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
