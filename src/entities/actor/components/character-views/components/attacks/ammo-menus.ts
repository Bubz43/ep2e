import type { Character } from '@src/entities/actor/proxies/character';
import { ItemType } from '@src/entities/entity-types';
import type { Explosive } from '@src/entities/item/proxies/explosive';
import type { Firearm } from '@src/entities/item/proxies/firearm';
import { FirearmAmmo } from '@src/entities/item/proxies/firearm-ammo';
import type { MeleeWeapon } from '@src/entities/item/proxies/melee-weapon';
import type { SeekerWeapon } from '@src/entities/item/proxies/seeker-weapon';
import type { SprayWeapon } from '@src/entities/item/proxies/spray-weapon';
import type { ThrownWeapon } from '@src/entities/item/proxies/thrown-weapon';
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
              draft.system.quantity = ammoCount;
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
            draft.system.quantity = change;
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
            draft.system.quantity = change;
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

export const openMeleePayloadMenu = (
  ev: MouseEvent,
  character: Character,
  weapon: MeleeWeapon,
) => {
  const { payload } = weapon;
  const { explosives } = character.weapons;

  const content: MWCMenuOption[] = [];
  if (payload) {
    content.push(
      {
        label: `${localize('remove')} ${payload.name}  (${localize(
          'discard',
        )})`,
        callback: () => weapon.removePayload(),
      },
      {
        label: `${localize('remove')} ${payload.name} (${localize('keep')})`,
        callback: async () => {
          const same = explosives.find((p) => p.isSameAs(payload));
          if (same) await same.setQuantity((current) => current + 1);
          else
            await character?.itemOperations.add(
              produce(
                payload.getDataCopy(),
                ({ system: data }) => void (data.quantity = 1),
              ),
            );
          await weapon.removePayload();
        },
      },
    );
  } else {
    content.push(
      ...explosives.map((p) => ({
        label: p.fullName,
        sublabel: p.fullType,
        callback: async () => {
          await weapon.setPayload(p);
          p.setQuantity((current) => current - 1);
        },
        disabled: !p.quantity,
      })),
    );
    if (content.length === 0) {
      content.push({
        label: `${localize('no')} ${localize('available')} ${localize(
          'payloads',
        )}`,
        callback: noop,
        disabled: true,
      });
    }
  }

  openMenu({
    position: ev,
    header: { heading: `${weapon.name} ${localize('payload')}` },
    content,
  });
};

export const openCoatingMenu = (
  ev: MouseEvent,
  character: Character,
  weapon: MeleeWeapon | ThrownWeapon,
) => {
  const { coating } = weapon;
  const coatings =
    character.consumables.flatMap((c) =>
      c.type === ItemType.Substance && !(c.isBlueprint || c.isElectronic)
        ? c
        : [],
    ) ?? [];
  const content: MWCMenuOption[] = [];
  if (coating) {
    content.push(
      {
        label: `${localize('remove')} ${coating.name}  (${localize(
          'discard',
        )})`,
        callback: () => weapon.removeCoating(),
      },
      {
        label: `${localize('remove')} ${coating.name} (${localize('keep')})`,
        callback: async () => {
          const amount =
            weapon.type === ItemType.ThrownWeapon ? weapon.quantity : 1;
          const same = coatings.find((c) => c.isSameAs(coating));
          if (same) await same.setQuantity((current) => current + amount);
          else
            await character?.itemOperations.add(
              produce(
                coating.getDataCopy(),
                ({ system: data }) => void (data.quantity = amount),
              ),
            );
          await weapon.removeCoating();
        },
      },
    );
  } else {
    content.push(
      ...coatings.map((c) => ({
        label: c.fullName,
        sublabel: c.fullType,
        callback: async () => {
          if (
            weapon.type === ItemType.ThrownWeapon &&
            weapon.quantity > c.quantity
          ) {
            await character.itemOperations.add(
              produce(weapon.getDataCopy(), (draft) => {
                draft.system.quantity = weapon.quantity - c.quantity;
              }),
            );
            await weapon.updater.batchCommits(() => {
              weapon.setCoating(c);
              weapon.setQuantity(c.quantity);
            });
            c.setQuantity(0);
          } else {
            await weapon.setCoating(c);
            c.setQuantity(
              (current) =>
                current -
                (weapon.type === ItemType.ThrownWeapon ? weapon.quantity : 1),
            );
          }
        },
        disabled: !c.quantity,
      })),
    );
    if (content.length === 0) {
      content.push({
        label: `${localize('no')} ${localize('available')} ${localize(
          'coating',
        )}`,
        callback: noop,
        disabled: true,
      });
    }
  }

  openMenu({
    position: ev,
    header: { heading: `${weapon.name} ${localize('coating')}` },
    content,
  });
};

export const openFirearmAmmoPayloadMenu = (
  ev: MouseEvent,
  character: Character,
  ammo: FirearmAmmo,
) => {
  const { payload } = ammo;
  const substances =
    character.consumables.flatMap((c) =>
      c.type === ItemType.Substance && !(c.isBlueprint || c.isElectronic)
        ? c
        : [],
    ) ?? [];

  const content: MWCMenuOption[] = [];

  if (payload) {
    content.push({
      label: `${localize('unload')} ${payload.name}`,
      callback: async () => {
        const { quantity: ammoQuantity } = ammo;
        const same = substances.find((s) => s.isSameAs(payload));
        if (same) await same.setQuantity((current) => current + ammoQuantity);
        else
          await character?.itemOperations.add(
            produce(
              payload.getDataCopy(),
              ({ system: data }) => void (data.quantity = ammoQuantity),
            ),
          );
        await ammo.removePayload();
      },
    });
  } else {
    content.push(
      ...substances.map((s) => ({
        label: s.fullName,
        sublabel: s.fullType,
        disabled: !s.quantity,
        callback: async () => {
          const amount = s.quantity;
          if (ammo.quantity > amount) {
            await character.itemOperations.add(
              produce(ammo.getDataCopy(), (draft) => {
                draft.system.quantity = ammo.quantity - amount;
              }),
            );
            await ammo.updater.batchCommits(() => {
              ammo.setPayload(s);
              ammo.setQuantity(amount);
            });
            s.setQuantity(0);
          } else {
            await ammo.setPayload(s);
            s.setQuantity((current) => current - ammo.quantity);
          }
        },
      })),
    );
    if (content.length === 0) {
      content.push({
        label: `${localize('no')} ${localize('available')} ${localize(
          'substances',
        )}`,
        callback: noop,
        disabled: true,
      });
    }
  }
  openMenu({
    position: ev,
    header: {
      heading: `${ammo.name} ${localize('payload')}`,
    },
    content,
  });
};

export const openSprayWeaponPayloadMenu = (
  ev: MouseEvent,
  character: Character,
  weapon: SprayWeapon,
) => {
  const { payload, firePayload } = weapon;
  const dosesPerShot = weapon.firePayload ? weapon.dosesPerShot : 1;
  const substances =
    character.consumables.flatMap((c) =>
      c.type === ItemType.Substance && !(c.isBlueprint || c.isElectronic)
        ? c
        : [],
    ) ?? [];
  const max = weapon.ammoState.max * dosesPerShot;
  const content: MWCMenuOption[] = [];
  if (payload) {
    const matching = substances.filter((s) => s.isSameAs(payload));
    if (matching.length) {
      for (const substance of substances) {
        content.push({
          label: `${localize('reload')} ${substance.fullName}`,
          disabled: payload.quantity >= max || !substance.quantity,
          callback: async () => {
            const change = Math.min(substance.quantity, max - payload.quantity);
            await substance.setQuantity((current) => current - change);
            await payload.setQuantity((current) => current + change);
          },
        });
      }
    } else {
      content.push({
        label: `${localize('reload')} ${payload.name}`,
        sublabel: `${localize('no')} ${localize('match')}`,
        disabled: true,
        callback: noop,
      });
    }

    content.push({
      label: `${localize('unload')} ${payload.name}`,
      callback: async () => {
        const amount = payload.quantity;
        const [same] = matching;
        if (same) await same.setQuantity((current) => current + amount);
        else
          await character?.itemOperations.add(
            produce(
              payload.getDataCopy(),
              ({ system: data }) => void (data.quantity = amount),
            ),
          );
        await weapon.removePayload();
      },
    });
  } else {
    content.push(
      ...substances.map((s) => ({
        label: s.fullName,
        sublabel: s.fullType,
        disabled: firePayload ? s.quantity < dosesPerShot : !s.quantity,
        callback: async () => {
          const amount = Math.min(s.quantity, max);
          const payload = produce(s.getDataCopy(), (draft) => {
            draft.system.quantity = amount;
          });
          await weapon.setPayload(payload);
          s.setQuantity((current) => current - amount);
        },
      })),
    );
    if (content.length === 0) {
      content.push({
        label: `${localize('no')} ${localize('available')} ${localize(
          'substances',
        )}`,
        callback: noop,
        disabled: true,
      });
    }
  }

  openMenu({
    position: ev,
    header: {
      heading: weapon.firePayload
        ? `${weapon.name} ${localize('payload')} ${dosesPerShot} / ${localize(
            'unit',
          )}`
        : `${weapon.name} ${localize('ammoCoating')}`,
    },
    content,
  });
};

export const openExplosiveSubstanceMenu = (
  ev: MouseEvent,
  character: Character,
  weapon: Explosive,
) => {
  const { substance } = weapon;
  const { dosesPerUnit } = weapon.epData;
  const substances =
    character.consumables.flatMap((c) =>
      c.type === ItemType.Substance && !(c.isBlueprint || c.isElectronic)
        ? c
        : [],
    ) ?? [];

  const content: MWCMenuOption[] = [];
  if (substance) {
    content.push({
      label: `${localize('unload')} ${substance.name}`,
      callback: async () => {
        const amount = weapon.quantity * dosesPerUnit;
        const same = substances.find((s) => s.isSameAs(substance));
        if (same) await same.setQuantity((current) => current + amount);
        else
          await character?.itemOperations.add(
            produce(
              substance.getDataCopy(),
              ({ system: data }) => void (data.quantity = amount),
            ),
          );
        await weapon.removeSubstance();
      },
    });
  } else {
    content.push(
      ...substances.map((s) => ({
        label: s.fullName,
        sublabel: s.fullType,
        disabled: s.quantity < dosesPerUnit,
        callback: async () => {
          const amount = Math.floor(s.quantity / dosesPerUnit);
          if (weapon.quantity > amount) {
            await character.itemOperations.add(
              produce(weapon.getDataCopy(), (draft) => {
                draft.system.quantity = weapon.quantity - amount;
              }),
            );
            await weapon.updater.batchCommits(() => {
              weapon.setSubstance(s);
              weapon.setQuantity(amount);
            });
            s.setQuantity(s.quantity % dosesPerUnit);
          } else {
            await weapon.setSubstance(s);
            s.setQuantity(
              (current) => current - dosesPerUnit * weapon.quantity,
            );
          }
        },
      })),
    );
    if (content.length === 0) {
      content.push({
        label: `${localize('no')} ${localize('available')} ${localize(
          'substances',
        )}`,
        callback: noop,
        disabled: true,
      });
    }
  }

  openMenu({
    position: ev,
    header: {
      heading: `${weapon.name} ${localize(
        'substance',
      )} ${dosesPerUnit} / ${localize('unit')}`,
    },
    content,
  });
};
